import { get } from "@vercel/blob";
import { errorResponse, HttpError, requireSession } from "@/lib/api";
import { isUuid } from "@/features/recordings/audio-formats";
import { getRecording } from "@/features/recordings/server";

export const runtime = "nodejs";

/** Streams the caller's own audio. Files live in a private store and are never exposed by URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    if (!isUuid(id)) throw new HttpError(404, "Not found");

    const rec = await getRecording(user.uid, id); // scoped to users/{uid}: ownership by construction
    if (!rec?.audioPath) throw new HttpError(404, "Not found");

    const result = await get(rec.audioPath, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) throw new HttpError(404, "Not found");

    const headers = new Headers({
      "Content-Type": result.blob.contentType ?? rec.audioFormat ?? "application/octet-stream",
      // Private audio must never land in shared caches.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (result.blob.size != null) headers.set("Content-Length", String(result.blob.size));
    return new Response(result.stream, { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
