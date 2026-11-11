import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { MAX_AUTH_AGE_SECONDS, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/session-constants";
import { sessionBodySchema } from "@/features/auth/schemas";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/i18n/config";

export const runtime = "nodejs";

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser callers carry no ambient cookies to abuse
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Exchange a fresh Firebase ID token for an httpOnly session cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminConfigured()) {
    return Response.json({ error: "Authentication backend is not configured" }, { status: 503 });
  }

  const parsed = sessionBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  try {
    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(parsed.data.idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > MAX_AUTH_AGE_SECONDS) {
      return Response.json({ error: "Recent sign-in required" }, { status: 401 });
    }

    const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    // Create the profile once. Entitlements (plan) are only ever written server-side.
    const jar = await cookies();
    const localeCookie = jar.get(LOCALE_COOKIE)?.value;
    const ref = adminDb().doc(`users/${decoded.uid}`);
    await ref
      .create({
        displayName: typeof decoded.name === "string" ? decoded.name : null,
        email: decoded.email ?? null,
        locale: isLocale(localeCookie) ? localeCookie : defaultLocale,
        theme: "dark",
        plan: "free",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      .catch((e: { code?: number }) => {
        if (e?.code !== 6) throw e; // 6 = ALREADY_EXISTS, expected on later sign-ins
      });

    jar.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("session creation failed", e instanceof Error ? e.name : "unknown");
    return Response.json({ error: "Invalid or expired credentials" }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
