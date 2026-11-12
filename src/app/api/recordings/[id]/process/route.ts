import { after } from "next/server";
import { z } from "zod";
import { errorResponse, guardOrigin, HttpError, requireSession } from "@/lib/api";
import { isUuid } from "@/features/recordings/audio-formats";
import { claimProcessing, runProcessing } from "@/features/recordings/pipeline";
import { safeTimezone } from "@/features/ai-analysis/time";
import { speechProviders, aiProviders } from "@/lib/ai/registry";

export const runtime = "nodejs";
export const maxDuration = 300; // transcription of a 10-minute note + analysis

const bodySchema = z.object({
  timezone: z.string().max(64).optional(),
  force: z.boolean().optional(), // re-run (e.g. after editing the transcript)
});

/** Starts transcription + analysis and returns immediately; the client polls GET /api/recordings/{id}. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { id } = await params;
    if (!isUuid(id)) throw new HttpError(404, "Not found");
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    if (speechProviders().length === 0 || aiProviders().length === 0) {
      throw new HttpError(503, "AI providers are not configured");
    }

    const claim = await claimProcessing(user.uid, id, { force: body.force === true });
    if (!claim.claimed) {
      if (claim.reason === "not_found") throw new HttpError(404, "Not found");
      return Response.json({ status: claim.reason }, { status: claim.reason === "running" ? 202 : 200 });
    }

    const timezone = safeTimezone(body.timezone);
    after(() => runProcessing(user.uid, id, { timezone, stage: claim.stage }));
    return Response.json({ status: "started", stage: claim.stage }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
