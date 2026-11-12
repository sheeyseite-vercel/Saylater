import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { errorResponse, guardOrigin, requireSession } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({ displayName: z.string().trim().min(1).max(60) });

/** Updates the caller's own display name. Identity comes from the session, never the body. */
export async function PATCH(req: Request) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { displayName } = schema.parse(await req.json().catch(() => null));
    await adminDb()
      .doc(`users/${user.uid}`)
      .set({ displayName, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return Response.json({ ok: true, displayName });
  } catch (e) {
    return errorResponse(e);
  }
}
