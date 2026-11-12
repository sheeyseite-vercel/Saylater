import { z } from "zod";
import { del, list } from "@vercel/blob";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, guardOrigin, HttpError, requireSession } from "@/lib/api";
import { isUuid } from "@/features/recordings/audio-formats";
import { getRecording, recordingsCol } from "@/features/recordings/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function ownedRecording(uid: string, params: Ctx["params"]) {
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, "Not found");
  const recording = await getRecording(uid, id);
  if (!recording) throw new HttpError(404, "Not found");
  return recording;
}

// Editing the transcript never touches the original `transcript`; the edit lives in its own field.
// `null` resets to the original.
const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    editedTranscript: z.string().max(50_000).nullable().optional(),
  })
  .refine((v) => v.title !== undefined || v.editedTranscript !== undefined);

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireSession({ strict: false });
    return Response.json({ recording: await ownedRecording(user.uid, params) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const rec = await ownedRecording(user.uid, params);
    const { title, editedTranscript } = patchSchema.parse(await req.json().catch(() => null));
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (title !== undefined) update.title = title;
    if (editedTranscript !== undefined) {
      update.editedTranscript = editedTranscript === null || editedTranscript.trim() === "" ? null : editedTranscript;
    }
    await recordingsCol(user.uid).doc(rec.id).update(update);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE /api/recordings/{id}            -> removes audio and the recording
 *  DELETE /api/recordings/{id}?audioOnly=1 -> removes the audio file, keeps transcript and metadata */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const rec = await ownedRecording(user.uid, params);
    const audioOnly = new URL(req.url).searchParams.get("audioOnly") === "1";

    // Delete the file first: if this fails the document stays, so nothing is silently orphaned.
    if (rec.audioPath) {
      const { blobs } = await list({ prefix: rec.audioPath, limit: 5 });
      const urls = blobs.filter((b) => b.pathname === rec.audioPath).map((b) => b.url);
      if (urls.length) await del(urls);
    }

    const ref = recordingsCol(user.uid).doc(rec.id);
    if (audioOnly) {
      await ref.update({ audioPath: null, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await ref.delete();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
