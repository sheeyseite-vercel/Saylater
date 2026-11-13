import { UploadError, uploadRecording } from "@/features/recordings/upload";
import { listOps, listPendingRecordings, markRecordingError, removeOp, removePendingRecording, SYNCED, type QueuedOp } from "./db";

async function sendOp(op: QueuedOp): Promise<Response> {
  const base = `/api/items/${op.collection}`;
  if (op.kind === "create") {
    return fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: op.id, ...op.data }) });
  }
  if (op.kind === "patch") {
    return fetch(`${base}/${op.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(op.data) });
  }
  return fetch(`${base}/${op.id}`, { method: "DELETE" });
}

let running = false;

/** Sends queued changes in order. Stops at the first network/server problem and keeps everything else. */
export async function flush(uid: string): Promise<{ sent: number; stopped: boolean }> {
  if (running || (typeof navigator !== "undefined" && !navigator.onLine)) return { sent: 0, stopped: true };
  running = true;
  let sent = 0;
  let stopped = false;
  try {
    for (const op of await listOps(uid)) {
      let res: Response;
      try {
        res = await sendOp(op);
      } catch {
        stopped = true; // offline
        break;
      }
      if (res.ok || res.status === 409 || (res.status === 404 && op.kind !== "create")) {
        await removeOp(op.seq as number);
        sent++;
      } else if (res.status === 401 || res.status >= 500 || res.status === 429) {
        stopped = true; // signed out or server trouble: keep it and retry later
        break;
      } else {
        await removeOp(op.seq as number); // rejected as invalid: retrying can never succeed
      }
    }

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
          await fetch(`/api/recordings/${rec.id}/process`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
          }).catch(() => undefined); // the detail page offers a manual retry
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
