import { createHash } from "node:crypto";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, guardOrigin, requireSession } from "@/lib/api";
import { subscriptionsCol } from "@/lib/push/server";

export const runtime = "nodejs";

const subSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});
const idFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

export async function POST(req: Request) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const sub = subSchema.parse(await req.json().catch(() => null));
    await subscriptionsCol(user.uid)
      .doc(idFor(sub.endpoint))
      .set({ endpoint: sub.endpoint, keys: sub.keys, createdAt: FieldValue.serverTimestamp() });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { endpoint } = z.object({ endpoint: z.string().url().max(1000) }).parse(await req.json().catch(() => null));
    await subscriptionsCol(user.uid).doc(idFor(endpoint)).delete();
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
