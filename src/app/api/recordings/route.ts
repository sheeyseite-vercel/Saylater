import { z } from "zod";
import { list } from "@vercel/blob";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, guardOrigin, HttpError, requireSession } from "@/lib/api";
import {
  ALLOWED_MIME_TYPES,
  audioPathFor,
  extensionFor,
  isUuid,
} from "@/features/recordings/audio-formats";
import { MAX_DURATION_SECONDS, MAX_FILE_BYTES } from "@/features/recordings/limits";
import { assertCanCreate, getRecording, listRecordings, recordingsCol } from "@/features/recordings/server";

export const runtime = "nodejs";

const createSchema = z.object({
  id: z.string().refine(isUuid),
  title: z.string().trim().min(1).max(120),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  durationSeconds: z.number().finite().min(0).max(MAX_DURATION_SECONDS).default(0),
  language: z.enum(["ar", "fr", "en"]).nullable().default(null), // optional hint for transcription
});

export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const data = await listRecordings(user.uid, {
      limit: Number.isFinite(limit) ? limit : 20,
      after: url.searchParams.get("after"),
    });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Register a recording after its audio has been uploaded. Idempotent per recording id. */
export async function POST(req: Request) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const input = createSchema.parse(await req.json().catch(() => null));

    const path = audioPathFor(user.uid, input.id, extensionFor(input.mimeType));
    const { blobs } = await list({ prefix: path, limit: 5 });
    const blob = blobs.find((b) => b.pathname === path);
    if (!blob) throw new HttpError(400, "Uploaded audio was not found");
    if (blob.size > MAX_FILE_BYTES) throw new HttpError(400, "File is too large");

    const existing = await getRecording(user.uid, input.id);
    if (existing) return Response.json({ recording: existing });

    await assertCanCreate(user.uid);
    await recordingsCol(user.uid)
      .doc(input.id)
      .create({
        userId: user.uid,
        title: input.title,
        audioPath: path,
        audioFormat: input.mimeType,
        audioBytes: blob.size,
        durationSeconds: Math.round(input.durationSeconds),
        language: input.language,
        transcript: "",
        editedTranscript: null,
        summary: null,
        processingStatus: "uploaded",
        transcriptionProvider: null,
        analysisProvider: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      .catch((e: { code?: number }) => {
        if (e?.code !== 6) throw e; // ALREADY_EXISTS from a concurrent retry is fine
      });

    const recording = await getRecording(user.uid, input.id);
    return Response.json({ recording }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
