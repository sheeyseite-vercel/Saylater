import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-constants";

const PRIVATE = [
  "/dashboard", "/capture", "/recordings", "/tasks", "/ideas", "/lists", "/reminders",
  "/calendar", "/assistant", "/search", "/insights", "/settings", "/billing",
];

// First line of defence only (cookie presence). Real verification happens server-side
// in the (dashboard) layout and in every API route.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPrivate && !req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
