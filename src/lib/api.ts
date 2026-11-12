import "server-only";
import { ZodError } from "zod";
import { AuthError } from "@/lib/firebase/verify-request";
import { getSessionUser, type SessionUser } from "@/lib/firebase/session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Identity always comes from the verified session cookie, never from the request body. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "Not authenticated");
  return user;
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function guardOrigin(req: Request) {
  if (!sameOrigin(req)) throw new HttpError(403, "Forbidden");
}

export function errorResponse(e: unknown): Response {
  if (e instanceof AuthError || e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  console.error("api error", e instanceof Error ? e.name : "unknown");
  return Response.json({ error: "Internal error" }, { status: 500 });
}
