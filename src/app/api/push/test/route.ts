import { errorResponse, guardOrigin, requireSession } from "@/lib/api";
import { pushToUser } from "@/lib/push/server";

export const runtime = "nodejs";

/** Sends a test notification to the caller's own devices. */
export async function POST(req: Request) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const result = await pushToUser(user.uid, {
      title: "SayLater",
      body: "✓",
      url: "/settings",
      tag: "test",
    });
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
