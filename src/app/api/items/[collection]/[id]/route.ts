import { errorResponse, guardOrigin, HttpError, requireSession } from "@/lib/api";
import { isCollection, patchSchemas } from "@/features/items/collections";
import { itemsCol, stamp, syncReminderQueue, toStored } from "@/features/items/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ collection: string; id: string }> };

async function target(uid: string, params: Ctx["params"]) {
  const { collection, id } = await params;
  if (!isCollection(collection) || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new HttpError(404, "Not found");
  const ref = itemsCol(uid, collection).doc(id); // scoped to users/{uid}: ownership by construction
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Not found");
  return { collection, id, ref };
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { collection, id, ref } = await target(user.uid, params);
    const patch = patchSchemas[collection].parse(await req.json().catch(() => null)) as Record<string, unknown>;
    await ref.update({ ...toStored(collection, patch), updatedAt: stamp() });
    if (collection === "reminders") await syncReminderQueue(user.uid, id, (await ref.get()).data() ?? null);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { collection, id, ref } = await target(user.uid, params);
    await ref.delete();
    if (collection === "reminders") await syncReminderQueue(user.uid, id, null);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
