export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const rtlLocales: readonly Locale[] = ["ar"];
export const isRtl = (l: Locale) => rtlLocales.includes(l);

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const wanted = header
    .split(",")
    .map((p) => p.trim().split(";")[0]?.toLowerCase().split("-")[0])
    .filter(Boolean);
  for (const w of wanted) if (isLocale(w)) return w;
  return defaultLocale;
}
