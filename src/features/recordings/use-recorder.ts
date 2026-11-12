"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeMime } from "./audio-formats";
import { MAX_DURATION_SECONDS } from "./limits";
import { deleteSession, putChunk, saveSession } from "./local-store";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";

export interface RecordedAudio {
  blob: Blob;
  mimeType: string; // normalized, e.g. "audio/webm"
  durationSeconds: number;
  sessionId: string | null; // IndexedDB recovery session, if any
}

/** Pick a container the current browser can actually record. Safari/iOS use MP4, Chromium/Firefox WebM/Ogg. */
export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<RecordedAudio | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const chunks = useRef<Blob[]>([]);
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const segmentStart = useRef(0);
  const accumulated = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  const mime = useRef("audio/webm");

  const currentMs = () =>
    accumulated.current + (segmentStart.current ? performance.now() - segmentStart.current : 0);

  const releaseHardware = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelled.current = true;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      releaseHardware();
    };
  }, [releaseHardware]);

  const fail = (key: string) => {
    setErrorKey(key);
    setStatus("error");
  };

  const stop = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") return;
    accumulated.current = currentMs();
    segmentStart.current = 0;
    rec.stop();
  }, []);

  const start = useCallback(async () => {
    setErrorKey(null);
    setResult(null);
    setElapsedMs(0);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return fail("unsupported");
    }
    setStatus("requesting");

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") return fail("permissionDenied");
      if (name === "NotFoundError" || name === "OverconstrainedError") return fail("noMicrophone");
      return fail("micError");
    }

    try {
      stream.current = media;
      const picked = pickMimeType();
      const rec = new MediaRecorder(media, picked ? { mimeType: picked } : undefined);
      recorder.current = rec;
      mime.current = rec.mimeType || picked || "audio/webm";

      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      ctx.createMediaStreamSource(media).connect(node);
      setAnalyser(node);

      chunks.current = [];
      cancelled.current = false;
      accumulated.current = 0;
      startedAt.current = Date.now();
      const id = crypto.randomUUID();
      sessionId.current = id;
      void saveSession({ id, mimeType: normalizeMime(mime.current), startedAt: startedAt.current, durationMs: 0 });

      let idx = 0;
      rec.ondataavailable = (e) => {
        if (!e.data.size) return;
        chunks.current.push(e.data);
        void putChunk(id, idx++, e.data);
        void saveSession({ id, mimeType: normalizeMime(mime.current), startedAt: startedAt.current, durationMs: currentMs() });
      };
      rec.onerror = () => {
        releaseHardware();
        fail("micError");
      };
      rec.onstop = () => {
        releaseHardware();
        if (cancelled.current) return;
        const blob = new Blob(chunks.current, { type: mime.current });
        if (!blob.size) return fail("micError");
        setResult({
          blob,
          mimeType: normalizeMime(blob.type),
          durationSeconds: Math.round(accumulated.current / 1000),
          sessionId: id,
        });
        setStatus("stopped");
      };

      rec.start(1000); // 1s timeslices so data is persisted continuously
      segmentStart.current = performance.now();
      setStatus("recording");
      timer.current = setInterval(() => {
        const ms = currentMs();
        setElapsedMs(ms);
        if (ms >= MAX_DURATION_SECONDS * 1000) stop(); // enforce the plan's duration limit
      }, 250);
    } catch {
      releaseHardware();
      fail("micError");
    }
  }, [releaseHardware, stop]);

  const pause = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state !== "recording") return;
    accumulated.current = currentMs();
    segmentStart.current = 0;
    rec.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state !== "paused") return;
    segmentStart.current = performance.now();
    rec.resume();
    setStatus("recording");
  }, []);

  const discard = useCallback(() => {
    cancelled.current = true;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    releaseHardware();
    const id = sessionId.current ?? result?.sessionId;
    if (id) void deleteSession(id);
    sessionId.current = null;
    chunks.current = [];
    accumulated.current = 0;
    segmentStart.current = 0;
    setResult(null);
    setElapsedMs(0);
    setErrorKey(null);
    setStatus("idle");
  }, [releaseHardware, result]);

  /** Use audio that did not come from the live recorder (an uploaded file or a recovered session). */
  const adopt = useCallback((audio: RecordedAudio) => {
    setErrorKey(null);
    setElapsedMs(audio.durationSeconds * 1000);
    setResult(audio);
    setStatus("stopped");
  }, []);

  return { status, errorKey, elapsedMs, result, analyser, start, pause, resume, stop, discard, adopt };
}
