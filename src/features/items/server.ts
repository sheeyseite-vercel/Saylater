import "server-only";
import { FieldValue, Timestamp, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DATE_FIELDS, type CollectionName } from "./collections";

export const itemsCol = (uid: string, c: CollectionName) => adminDb().collection(`users/${uid}/${c}`);

/** Timestamps -> ISO strings, so documents can cross the server/client boundary. */
export function serialize<T>(snap: DocumentSnapshot): T | null {
  const d = snap.data();
  if (!d) return null;
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(d)) out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
  return out as T;
}

export async function listItems<T>(uid: string, c: CollectionName, limit = 300): Promise<T[]> {
  const snaps = await itemsCol(uid, c).orderBy("createdAt", "desc").limit(limit).get();
  return snaps.docs.map((s) => serialize<T>(s)).filter((x): x is T => x !== null);
}

/** Converts validated ISO date strings to Timestamps before writing. */
export function toStored(c: CollectionName, data: Record<string, unknown>): DocumentData {
  const out: DocumentData = { ...data };
  for (const f of DATE_FIELDS[c]) {
    if (f in out) out[f] = typeof out[f] === "string" ? Timestamp.fromDate(new Date(out[f] as string)) : null;
  }
  return out;
}

export const stamp = () => FieldValue.serverTimestamp();

/**
 * Pending reminders are mirrored in a small top-level queue so the cron job can find what is due
 * with a single-field query (no composite index, no scan of every user).
 */
export const queueRef = (uid: string, id: string) => adminDb().doc(`reminderQueue/${uid}_${id}`);

export async function syncReminderQueue(
  uid: string,
  id: string,
  r: { status?: unknown; remindAt?: unknown; title?: unknown } | null,
): Promise<void> {
  const at = r?.remindAt instanceof Timestamp ? r.remindAt : typeof r?.remindAt === "string" ? Timestamp.fromDate(new Date(r.remindAt)) : null;
  if (r && r.status === "scheduled" && at) {
    await queueRef(uid, id).set({ uid, reminderId: id, remindAt: at, title: String(r.title ?? "") });
  } else {
    await queueRef(uid, id).delete();
  }
}
