import "server-only";
import { adminAuth } from "./admin";

export class AuthError extends Error {
  constructor(public status: 401 | 403 | 503, message: string) {
    super(message);
  }
}

/**
 * Derive the caller's identity from a verified Firebase ID token.
 * Never accept a user id from the request body, query, or path.
 */
export async function requireUser(req: Request): Promise<{ uid: string; email?: string }> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AuthError(401, "Missing bearer token");
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    return { uid: decoded.uid, email: decoded.email };
  } catch (e) {
    if (e instanceof Error && e.message.includes("not configured")) {
      throw new AuthError(503, "Authentication backend is not configured");
    }
    throw new AuthError(401, "Invalid or expired token");
  }
}

export function authErrorResponse(e: unknown): Response | null {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  return null;
}
