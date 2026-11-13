import "server-only";
import webpush from "web-push";
import { adminDb } from "@/lib/firebase/admin";

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let cached: { publicKey: string; privateKey: string } | null = null;

/**
 * VAPID keys are generated once on first use and kept in Firestore (`system/vapid`, which no client
 * rule can read), so there is no secret to copy between dashboards.
 */
export async function getVapid() {
  if (cached) return cached;
  const ref = adminDb().doc("system/vapid");
  let snap = await ref.get();
  if (!snap.exists) {
    await ref.create(webpush.generateVAPIDKeys()).catch(() => undefined); // lost a race: read the winner below
    snap = await ref.get();
  }
  cached = { publicKey: String(snap.get("publicKey")), privateKey: String(snap.get("privateKey")) };
  return cached;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export type PushOutcome = "sent" | "gone" | "failed";

export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<PushOutcome> {
  const { publicKey, privateKey } = await getVapid();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), {
      TTL: 60 * 60,
      vapidDetails: {
        subject: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ? process.env.NEXT_PUBLIC_APP_URL : "https://saylater.vercel.app",
        publicKey,
        privateKey,
      },
    });
    return "sent";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed"; // 404/410: the browser dropped the subscription
  }
}

export const subscriptionsCol = (uid: string) => adminDb().collection(`users/${uid}/pushSubscriptions`);

/** Sends to every device of a user and prunes dead subscriptions. */
export async function pushToUser(uid: string, payload: PushPayload) {
  const subs = await subscriptionsCol(uid).get();
  let sent = 0;
  let failed = 0;
  for (const doc of subs.docs) {
    const outcome = await sendPush(doc.data() as StoredSubscription, payload);
    if (outcome === "sent") sent++;
    else if (outcome === "gone") await doc.ref.delete();
    else failed++;
  }
  return { devices: subs.size, sent, failed };
}
