import { timingSafeEqual } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { pushToUser } from "@/lib/push/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTEMPTS = 3;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never open without a configured secret
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

/**
 * Delivers due reminders. Called by Vercel Cron (once a day on the free plan) and, for minute-level
 * delivery, by any external scheduler that sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = adminDb();
  const due = await db.collection("reminderQueue").where("remindAt", "<=", Timestamp.now()).limit(200).get();
  let delivered = 0;
  let retried = 0;
  let skipped = 0;

  for (const q of due.docs) {
    const { uid, reminderId, attempts = 0 } = q.data() as { uid: string; reminderId: string; attempts?: number };
    const ref = db.doc(`users/${uid}/reminders/${reminderId}`);
    const r = await ref.get();
    if (!r.exists || r.get("status") !== "scheduled") {
      await q.ref.delete();
      skipped++;
      continue;
    }

    const result = await pushToUser(uid, {
      title: String(r.get("title") ?? "SayLater"),
      body: String(r.get("description") ?? ""),
      url: "/calendar",
      tag: reminderId,
    });

    // Transient failures on every device: try again on the next run, a bounded number of times.
    if (result.devices > 0 && result.sent === 0 && result.failed > 0 && attempts + 1 < MAX_ATTEMPTS) {
      await q.ref.update({ attempts: attempts + 1 });
      retried++;
      continue;
    }

    await ref.update({
      status: "sent",
      sentAt: Timestamp.now(),
      pushDelivered: result.sent > 0, // false when the user has no device subscribed: it still shows as due in the app
      updatedAt: Timestamp.now(),
    });
    await q.ref.delete();
    delivered++;
  }

  return Response.json({ due: due.size, delivered, retried, skipped });
}
