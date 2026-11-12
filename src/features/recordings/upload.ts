import { upload } from "@vercel/blob/client";
import { audioPathFor, extensionFor, isAllowedMime } from "./audio-formats";

export class UploadError extends Error {
  constructor(public key: "notAuthorized" | "quota" | "uploadFailed", message?: string) {
    super(message ?? key);
  }
}

export interface UploadInput {
  uid: string;
  /** Stable per recording attempt so a retry overwrites the same file instead of leaving orphans. */
  recordingId: string;
  blob: Blob;
  mimeType: string;
  title: string;
  durationSeconds: number;
  language: "ar" | "fr" | "en" | null;
  onProgress?: (percentage: number) => void;
}

/** 1) direct upload to the private Blob store  2) register metadata (server verifies the file). */
export async function uploadRecording(input: UploadInput): Promise<string> {
  if (!isAllowedMime(input.mimeType)) throw new UploadError("uploadFailed", "Unsupported format");
  const path = audioPathFor(input.uid, input.recordingId, extensionFor(input.mimeType));

  try {
    await upload(path, input.blob, {
      access: "private",
      handleUploadUrl: "/api/recordings/upload",
      contentType: input.mimeType,
      multipart: input.blob.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => input.onProgress?.(Math.round(percentage)),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Not authenticated")) throw new UploadError("notAuthorized");
    if (msg.includes("limit reached")) throw new UploadError("quota");
    throw new UploadError("uploadFailed");
  }

  const res = await fetch("/api/recordings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: input.recordingId,
      title: input.title,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
      language: input.language,
    }),
  });
  if (res.status === 401) throw new UploadError("notAuthorized");
  if (res.status === 403) throw new UploadError("quota");
  if (!res.ok) throw new UploadError("uploadFailed");
  return input.recordingId;
}

/** Best-effort duration of an audio file; 0 when the browser cannot tell (e.g. MediaRecorder WebM). */
export function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const finish = (v: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
    };
    const timeout = setTimeout(() => finish(0), 5000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      finish(audio.duration);
    };
    audio.onerror = () => {
      clearTimeout(timeout);
      finish(0);
    };
    audio.src = url;
  });
}
