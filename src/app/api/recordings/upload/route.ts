import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { AuthError } from "@/lib/firebase/verify-request";
import { HttpError, requireSession } from "@/lib/api";
import { ALLOWED_MIME_TYPES, isOwnAudioPath } from "@/features/recordings/audio-formats";
import { MAX_FILE_BYTES } from "@/features/recordings/limits";
import { assertCanCreate } from "@/features/recordings/server";

export const runtime = "nodejs";

/**
 * Issues short-lived client-upload tokens. The browser then uploads the audio straight to the
 * private Blob store (serverless request bodies are too small for audio). Metadata is NOT trusted
 * from the upload callback: POST /api/recordings verifies the blob exists before creating the doc.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const user = await requireSession(); // only runs for browser token requests
        if (!isOwnAudioPath(pathname, user.uid)) throw new HttpError(400, "Invalid upload path");
        await assertCanCreate(user.uid);
        return {
          allowedContentTypes: [...ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true, // lets the client retry the same recording id after a failed attempt
          tokenPayload: JSON.stringify({ uid: user.uid }),
        };
      },
      onUploadCompleted: async () => {
        // Intentionally empty; see doc comment above.
      },
    });
    return Response.json(json);
  } catch (e) {
    if (e instanceof AuthError || e instanceof HttpError) {
      return Response.json({ error: e.message }, { status: e instanceof AuthError ? e.status : e.status });
    }
    return Response.json({ error: "Upload could not be authorized" }, { status: 400 });
  }
}
