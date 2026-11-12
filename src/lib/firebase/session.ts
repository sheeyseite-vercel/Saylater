import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-constants";
import { adminAuth, isAdminConfigured } from "./admin";

export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
}

const build = (checkRevoked: boolean) =>
  cache(async (): Promise<SessionUser | null> => {
    if (!isAdminConfigured()) return null;
    const value = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!value) return null;
    try {
      const d = await adminAuth().verifySessionCookie(value, checkRevoked);
      return {
        uid: d.uid,
        email: d.email ?? null,
        name: typeof d.name === "string" ? d.name : null,
        emailVerified: Boolean(d.email_verified),
      };
    } catch {
      return null;
    }
  });

/**
 * Fast path for rendering pages: verifies the cookie's signature and expiry locally, with no
 * network round trip. A session revoked elsewhere stays valid for rendering until the cookie
 * expires (5 days), but every mutation uses the strict path below.
 */
export const getSessionUser = build(false);

/** Strict path for mutations: also asks Firebase whether the session has been revoked. */
export const getVerifiedSessionUser = build(true);
