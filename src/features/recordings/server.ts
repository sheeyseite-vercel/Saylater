import "server-only";
import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/api";
import type { ProcessingStatus, Recording } from "@/types/domain";
import { FREE_MAX_RECORDINGS } from "./limits";

export const recordingsCol = (uid: string) => adminDb().collection(`users/${uid}/recordings`);

const iso = (v: unknown): string =>
  v instanceof Timestamp ? v.toDate().toISOString() : new Date(0).toISOString();

export function toRecording(snap: DocumentSnapshot): Recording | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    userId: String(d.userId),
    title: String(d.title ?? ""),
    audioPath: typeof d.audioPath === "string" ? d.audioPath : null,
    audioFormat: String(d.audioFormat ?? ""),
    audioBytes: Number(d.audioBytes ?? 0),
    durationSeconds: Number(d.durationSeconds ?? 0),
    language: typeof d.language === "string" ? d.language : null,
    transcript: String(d.transcript ?? ""),
    editedTranscript: typeof d.editedTranscript === "string" ? d.editedTranscript : null,
    summary: typeof d.summary === "string" ? d.summary : null,
    processingStatus: (d.processingStatus ?? "uploaded") as ProcessingStatus,
    transcriptionProvider: typeof d.transcriptionProvider === "string" ? d.transcriptionProvider : null,
    analysisProvider: typeof d.analysisProvider === "string" ? d.analysisProvider : null,
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

// Cursor = "<seconds>_<nanoseconds>" of the last item's createdAt, so paging never skips
// or repeats documents that share a millisecond.
const CURSOR_RE = /^(\d{1,12})_(\d{1,9})$/;

export async function listRecordings(uid: string, opts: { limit?: number; after?: string | null } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  let q = recordingsCol(uid).orderBy("createdAt", "desc").limit(limit + 1);
  const m = opts.after ? CURSOR_RE.exec(opts.after) : null;
  if (m) q = q.startAfter(new Timestamp(Number(m[1]), Number(m[2])));

  const snaps = (await q.get()).docs;
  const page = snaps.slice(0, limit);
  const last = page[page.length - 1];
  const ts = last?.get("createdAt");
  const nextCursor =
    snaps.length > limit && ts instanceof Timestamp ? `${ts.seconds}_${ts.nanoseconds}` : null;

  const items = page.map(toRecording).filter((r): r is Recording => r !== null);
  return { items, nextCursor };
}

export async function getRecording(uid: string, id: string): Promise<Recording | null> {
  return toRecording(await recordingsCol(uid).doc(id).get());
}

export async function countRecordings(uid: string): Promise<number> {
  return (await recordingsCol(uid).count().get()).data().count;
}

export async function assertCanCreate(uid: string): Promise<void> {
  if ((await countRecordings(uid)) >= FREE_MAX_RECORDINGS) {
    throw new HttpError(403, "Recording limit reached for your plan");
  }
}
