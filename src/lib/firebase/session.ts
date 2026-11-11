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

/**
 * Verified identity from the httpOnly session cookie (revocation is checked).
 * Returns null when signed out, when the cookie is invalid, or when Firebase Admin
 * is not configured. Never trust a user id from anywhere else.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isAdminConfigured()) return null;
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const d = await adminAuth().verifySessionCookie(value, true);
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
