"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

const fmt = (iso: string, locale: string, timeZone?: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso));

/** Renders in the viewer's own time zone. Server HTML uses UTC, then the client corrects it after hydration. */
export function LocalDate({ iso }: { iso: string }) {
  const locale = useLocale();
  const [text, setText] = useState(() => fmt(iso, locale, "UTC"));
  useEffect(() => setText(fmt(iso, locale)), [iso, locale]);
  return <time dateTime={iso}>{text}</time>;
}
