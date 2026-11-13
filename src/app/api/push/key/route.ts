import { errorResponse, requireSession } from "@/lib/api";
import { getVapid } from "@/lib/push/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession({ strict: false });
    return Response.json({ publicKey: (await getVapid()).publicKey });
  } catch (e) {
    return errorResponse(e);
  }
}
