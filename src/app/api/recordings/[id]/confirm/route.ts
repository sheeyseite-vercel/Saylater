import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { errorResponse, guardOrigin, HttpError, requireSession } from "@/lib/api";
import { isUuid } from "@/features/recordings/audio-formats";
import { recordingsCol } from "@/features/recordings/server";
import { analysisItemSchema, type AnalysisItem } from "@/lib/ai/schemas/analysis";

export const runtime = "nodejs";

const bodySchema = z.object({ items: z.array(analysisItemSchema).max(100) });
const ts = (iso: string | null) => (iso ? Timestamp.fromDate(new Date(iso)) : null);

function toDoc(uid: string, recordingId: string, item: AnalysisItem): { col: string; data: Record<string, unknown> } {
  const base = {
    userId: uid,
    sourceRecordingId: recordingId,
    title: item.title,
    description: item.description,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  switch (item.type) {
    case "task":
      return {
        col: "tasks",
        data: { ...base, priority: item.priority, status: "pending", dueDate: ts(item.dueDate), category: null, requiresConfirmation: false },
      };
    case "idea":
      return { col: "ideas", data: { ...base, tags: item.tags, category: null, favorite: false } };
    case "shopping_list":
      return {
        col: "lists",
        data: { ...base, kind: "shopping", items: item.items.map((text) => ({ text, done: false })) },
      };
    case "reminder":
      if (!item.remindAt) throw new HttpError(400, "A reminder needs a date and time");
      return { col: "reminders", data: { ...base, remindAt: ts(item.remindAt), status: "scheduled" } };
    case "event":
      if (!item.startsAt) throw new HttpError(400, "An event needs a start time");
      return { col: "events", data: { ...base, startsAt: ts(item.startsAt), endsAt: ts(item.endsAt) } };
    default:
      return { col: "notes", data: { ...base, kind: item.type } };
  }
}

/**
 * The user's reviewed (and possibly edited) selection becomes real records. Only items the user
 * kept are sent. Deterministic document ids + a transaction on the recording status make a double
 * submit a no-op instead of creating duplicates.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { id } = await params;
    if (!isUuid(id)) throw new HttpError(404, "Not found");
    const { items } = bodySchema.parse(await req.json().catch(() => null));
    const docs = items.map((it) => toDoc(user.uid, id, it)); // validates dates before any write

    const db = adminDb();
    const ref = recordingsCol(user.uid).doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, "Not found");
      if (snap.get("processingStatus") !== "awaiting_review") throw new HttpError(409, "Already confirmed");
      const run = String(snap.get("analysisRunId") ?? id);
      docs.forEach((d, i) => {
        tx.create(db.collection(`users/${user.uid}/${d.col}`).doc(`${run}_${i}`), d.data);
      });
      tx.update(ref, {
        processingStatus: "completed",
        confirmedCount: docs.length,
        confirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return Response.json({ ok: true, created: docs.length });
  } catch (e) {
    return errorResponse(e);
  }
}
