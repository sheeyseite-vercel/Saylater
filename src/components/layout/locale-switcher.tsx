"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { locales } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

const NAMES = { en: "English", fr: "Français", ar: "العربية" } as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label={t("interfaceLanguage")}
      value={locale}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setLocale(e.target.value);
          router.refresh();
        })
      }
      className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {NAMES[l]}
        </option>
      ))}
    </select>
  );
}
