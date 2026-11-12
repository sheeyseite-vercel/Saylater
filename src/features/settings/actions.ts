"use server";

import { cookies } from "next/headers";
import { FONT_COOKIE, SIZE_COOKIE, isFont, isSize } from "@/lib/appearance";

/** Persists display preferences in cookies so the server renders the right font with no flash. */
export async function saveAppearance(input: { font?: string; size?: string }): Promise<void> {
  const jar = await cookies();
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  if (isFont(input.font)) jar.set(FONT_COOKIE, input.font, opts);
  if (isSize(input.size)) jar.set(SIZE_COOKIE, input.size, opts);
}
