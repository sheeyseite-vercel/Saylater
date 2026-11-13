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
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    // Clients may supply the id so an offline-created item and its later sync are the same document.
    const { id: clientId, ...fields } = body ?? {};
    const data = createSchemas[collection].parse(fields) as Record<string, unknown>;
    const wantedId = typeof clientId === "string" && /^[0-9a-f-]{36}$/i.test(clientId) ? clientId : null;

    const ref = wantedId ? itemsCol(user.uid, collection).doc(wantedId) : itemsCol(user.uid, collection).doc();
    if (wantedId) {
      const existing = await ref.get();
      if (existing.exists) return Response.json({ item: serialize(existing) }, { status: 200 }); // a retry: already saved
    }
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
