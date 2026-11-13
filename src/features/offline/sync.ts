import { UploadError, uploadRecording } from "@/features/recordings/upload";
import { listPendingRecordings, markRecordingError, removePendingRecording, SYNCED } from "./db";

let running = false;

/** Sends queued changes in order. Stops at the first network/server problem and keeps everything else. */
export async function flush(uid: string): Promise<{ sent: number; stopped: boolean }> {
  if (running || (typeof navigator !== "undefined" && !navigator.onLine)) return { sent: 0, stopped: true };
  running = true;
  let sent = 0;
  let stopped = false;
  try {
    if (!stopped) {
      for (const rec of await listPendingRecordings(uid)) {
        if (rec.error === "quota") continue; // waits for the user (delete something or remove it)
        try {
          await uploadRecording({
            uid,
            recordingId: rec.id,
            blob: rec.blob,
            mimeType: rec.mimeType,
            title: rec.title,
            durationSeconds: rec.durationSeconds,
            language: rec.language,
          });
          await removePendingRecording(rec.id);
          sent++;
        } catch (e) {
          if (e instanceof UploadError && e.key === "quota") await markRecordingError(rec.id, "quota");
          else stopped = true;
          if (stopped) break;
        }
      }
    }
  } finally {
    running = false;
  }
  if (sent > 0) window.dispatchEvent(new Event(SYNCED));
  return { sent, stopped };
}
