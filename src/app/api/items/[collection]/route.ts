import { errorResponse, guardOrigin, HttpError, requireSession } from "@/lib/api";
import { createSchemas, isCollection } from "@/features/items/collections";
import { itemsCol, serialize, stamp, syncReminderQueue, toStored } from "@/features/items/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ collection: string }> };

/** Manual creation (the app's "+ add" fields). AI-created items go through /api/recordings/{id}/confirm. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    guardOrigin(req);
    const user = await requireSession();
    const { collection } = await params;
    if (!isCollection(collection)) throw new HttpError(404, "Not found");
    const data = createSchemas[collection].parse(await req.json().catch(() => null)) as Record<string, unknown>;

    const ref = itemsCol(user.uid, collection).doc();
    await ref.set({
      ...toStored(collection, data),
      userId: user.uid,
      sourceRecordingId: null,
      createdAt: stamp(),
      updatedAt: stamp(),
    });
    if (collection === "reminders") await syncReminderQueue(user.uid, ref.id, data);
    return Response.json({ item: serialize(await ref.get()) }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
