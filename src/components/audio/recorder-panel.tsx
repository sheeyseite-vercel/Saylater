"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Mic, Pause, Play, Square, Trash2, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "./waveform";
import { useRecorder, type RecordedAudio } from "@/features/recordings/use-recorder";
import { UploadError, readDuration, uploadRecording } from "@/features/recordings/upload";
import { ALLOWED_EXTENSIONS, mimeFromFile } from "@/features/recordings/audio-formats";
import { MAX_DURATION_SECONDS, MAX_FILE_BYTES } from "@/features/recordings/limits";
import {
  deleteSession,
  listSessions,
  loadSessionBlob,
  type LocalSession,
} from "@/features/recordings/local-store";
import { formatClock, formatDuration } from "@/lib/format";

type Lang = "auto" | "ar" | "fr" | "en";

export function RecorderPanel({ uid }: { uid: string }) {
  const t = useTranslations("capture");
  const format = useFormatter();
  const router = useRouter();
  const rec = useRecorder();

  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<Lang>("auto");
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [recoverable, setRecoverable] = useState<LocalSession | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // One id per recording attempt: retries overwrite the same file rather than creating orphans.
  const attemptId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { result, status } = rec;
  const busy = status === "recording" || status === "paused" || status === "requesting";

  // Offer to recover a recording left behind by a crash, refresh, or closed tab.
  useEffect(() => {
    void listSessions().then((s) => setRecoverable(s.find((x) => x.durationMs > 1000) ?? null));
  }, []);

  useEffect(() => {
    if (!result) return setPreviewUrl(null);
    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    attemptId.current = crypto.randomUUID();
    setTitle(
      t("defaultTitle", { date: format.dateTime(new Date(), { dateStyle: "medium", timeStyle: "short" }) }),
    );
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Never lose audio silently: warn before leaving with anything unsaved.
  useEffect(() => {
    const unsaved = (busy || result) && !saved;
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, result, saved]);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setErrorKey(null);
    const mimeType = mimeFromFile(file);
    if (!mimeType) return setErrorKey("fileType");
    if (file.size > MAX_FILE_BYTES) return setErrorKey("fileTooLarge");
    const durationSeconds = await readDuration(file);
    if (durationSeconds > MAX_DURATION_SECONDS) return setErrorKey("tooLong");
    rec.adopt({ blob: file, mimeType, durationSeconds, sessionId: null });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onRecover() {
    if (!recoverable) return;
    const blob = await loadSessionBlob(recoverable);
    if (!blob) {
      await deleteSession(recoverable.id);
      return setRecoverable(null);
    }
    rec.adopt({
      blob,
      mimeType: recoverable.mimeType,
      durationSeconds: Math.round(recoverable.durationMs / 1000),
      sessionId: recoverable.id,
    });
    setRecoverable(null);
  }

  async function onSave(audio: RecordedAudio) {
    if (!attemptId.current) return;
    setUploading(true);
    setErrorKey(null);
    setProgress(0);
    try {
      const id = await uploadRecording({
        uid,
        recordingId: attemptId.current,
        blob: audio.blob,
        mimeType: audio.mimeType,
        title: title.trim() || t("untitled"),
        durationSeconds: audio.durationSeconds,
        language: lang === "auto" ? null : lang,
        onProgress: setProgress,
      });
      setSaved(true);
      if (audio.sessionId) await deleteSession(audio.sessionId); // only after the server confirmed
      router.push(`/recordings/${id}`);
    } catch (e) {
      // Keep the audio (and its local copy) so the user can retry.
      setErrorKey(e instanceof UploadError ? e.key : "uploadFailed");
      setUploading(false);
    }
  }

  const err = rec.errorKey ?? errorKey;

  return (
    <div className="space-y-6">
      {recoverable && !result && !busy && (
        <section className="glass rounded-2xl p-4" role="status">
          <p className="font-medium">{t("recoverTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("recoverBody", { duration: formatDuration(Math.round(recoverable.durationMs / 1000)) })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="h-9" onClick={onRecover}>
              {t("recover")}
            </Button>
            <Button
              variant="ghost"
              className="h-9"
              onClick={async () => {
                await deleteSession(recoverable.id);
                setRecoverable(null);
              }}
            >
              {t("discard")}
            </Button>
          </div>
        </section>
      )}

      {!result && (
        <section className="glass space-y-6 rounded-2xl p-6 text-center">
          <Waveform analyser={rec.analyser} active={status === "recording"} />
          <p className="text-4xl font-semibold tabular-nums" aria-live="off" dir="ltr">
            {formatClock(rec.elapsedMs)}
          </p>
          <p className="text-sm text-muted-foreground" role="status">
            {status === "recording" && t("recording")}
            {status === "paused" && t("paused")}
            {status === "requesting" && t("requesting")}
            {(status === "idle" || status === "error") && t("tapToStart")}
          </p>

          <div className="flex items-center justify-center gap-4">
            {(status === "idle" || status === "error" || status === "requesting") && (
              <button
                type="button"
                onClick={rec.start}
                disabled={status === "requesting"}
                aria-label={t("start")}
                className="brand-gradient flex h-24 w-24 items-center justify-center rounded-full text-primary-foreground shadow-xl transition hover:scale-105 disabled:opacity-60"
              >
                <Mic className="h-10 w-10" />
              </button>
            )}
            {busy && status !== "requesting" && (
              <>
                <Button
                  variant="ghost"
                  className="h-14 w-14 rounded-full p-0"
                  aria-label={t("cancel")}
                  onClick={rec.discard}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                {status === "recording" ? (
                  <Button variant="ghost" className="h-14 w-14 rounded-full p-0" aria-label={t("pause")} onClick={rec.pause}>
                    <Pause className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="h-14 w-14 rounded-full p-0" aria-label={t("resume")} onClick={rec.resume}>
                    <Play className="h-6 w-6" />
                  </Button>
                )}
                <button
                  type="button"
                  onClick={rec.stop}
                  aria-label={t("stop")}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive text-primary-foreground shadow-xl"
                >
                  <Square className="h-8 w-8" />
                </button>
              </>
            )}
          </div>

          {!busy && (
            <div className="border-t border-border pt-4">
              <input
                ref={fileInput}
                type="file"
                accept={`audio/*,${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}`}
                className="sr-only"
                id="audio-file"
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
              <Button variant="ghost" className="mx-auto h-10 w-auto" onClick={() => fileInput.current?.click()}>
                <UploadIcon className="me-2 h-4 w-4" />
                {t("uploadFile")}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("limits", { minutes: MAX_DURATION_SECONDS / 60, mb: MAX_FILE_BYTES / (1024 * 1024) })}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("backgroundNote")}</p>
        </section>
      )}

      {result && (
        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">{t("preview")}</h2>
          {previewUrl && <audio controls src={previewUrl} className="w-full" />}
          <p className="text-sm text-muted-foreground" dir="ltr">
            {formatDuration(result.durationSeconds)} · {result.mimeType}
          </p>

          <div className="space-y-1.5">
            <label htmlFor="rec-title" className="text-sm font-medium">
              {t("titleLabel")}
            </label>
            <input
              id="rec-title"
              value={title}
              maxLength={120}
              disabled={uploading}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rec-lang" className="text-sm font-medium">
              {t("languageLabel")}
            </label>
            <select
              id="rec-lang"
              value={lang}
              disabled={uploading}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3"
            >
              <option value="auto">{t("langAuto")}</option>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          {uploading && (
            <div role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="brand-gradient h-full transition-all" style={{ width: `${progress ?? 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("uploading", { percent: progress ?? 0 })}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button disabled={uploading} onClick={() => onSave(result)}>
              {errorKey ? t("retry") : t("save")}
            </Button>
            {!confirmDiscard ? (
              <Button variant="ghost" className="w-auto" disabled={uploading} onClick={() => setConfirmDiscard(true)}>
                {t("discard")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-auto text-destructive"
                onClick={() => {
                  setConfirmDiscard(false);
                  rec.discard();
                }}
              >
                {t("confirmDiscard")}
              </Button>
            )}
          </div>
        </section>
      )}

      {err && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${err}`, { minutes: MAX_DURATION_SECONDS / 60, mb: MAX_FILE_BYTES / (1024 * 1024) })}
        </p>
      )}
    </div>
  );
}
