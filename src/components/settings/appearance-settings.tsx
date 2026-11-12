"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Check, Moon, Sun } from "lucide-react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { saveAppearance } from "@/features/settings/actions";
import { ACCENTS, ACCENT_SWATCH, FONTS, FONT_STACKS, SIZES, type AccentChoice, type FontChoice, type SizeChoice } from "@/lib/appearance";
import { cn } from "@/lib/utils";

export function AppearanceSettings({ initialFont, initialSize, initialAccent }: { initialFont: FontChoice; initialSize: SizeChoice; initialAccent: AccentChoice }) {
  const t = useTranslations("settings");
  const { resolvedTheme, setTheme } = useTheme();
  const [font, setFont] = useState(initialFont);
  const [size, setSize] = useState(initialSize);
  const [accent, setAccent] = useState(initialAccent);
  const [, start] = useTransition();

  // Applied instantly on <html>; the cookie makes it stick for the next server render.
  function choose(next: { font?: FontChoice; size?: SizeChoice; accent?: AccentChoice }) {
    if (next.accent) {
      setAccent(next.accent);
      document.documentElement.dataset.accent = next.accent;
    }
    if (next.font) {
      setFont(next.font);
      document.documentElement.dataset.font = next.font;
    }
    if (next.size) {
      setSize(next.size);
      document.documentElement.dataset.size = next.size;
    }
    start(() => void saveAppearance(next));
  }

  return (
    <section className="glass space-y-6 rounded-2xl p-5 sm:p-6">
      <h2 className="font-semibold">{t("appearance")}</h2>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("theme")}</p>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((m) => {
            const active = resolvedTheme === m;
            const Icon = m === "light" ? Sun : Moon;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(m)}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition",
                  active ? "border-primary bg-primary/15" : "border-border bg-card hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(m)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("accent")}</p>
        <div role="radiogroup" aria-label={t("accent")} className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={accent === a}
              aria-label={t(`accents.${a}`)}
              title={t(`accents.${a}`)}
              onClick={() => choose({ accent: a })}
              style={{ backgroundColor: ACCENT_SWATCH[a] }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition",
                accent === a ? "ring-2 ring-foreground" : "hover:scale-105",
              )}
            >
              {accent === a && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("interfaceLanguage")}</p>
        <LocaleSwitcher />
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{t("font")}</p>
          <p className="text-xs text-muted-foreground">{t("fontHint")}</p>
        </div>
        <div role="radiogroup" aria-label={t("font")} className="grid gap-2 sm:grid-cols-2">
          {FONTS.map((f) => {
            const active = font === f;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose({ font: f })}
                className={cn(
                  "rounded-xl border p-3 text-start transition",
                  active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted",
                )}
              >
                <span className="flex items-center justify-between text-xs text-muted-foreground">
                  {t(`fonts.${f}`)}
                  {active && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                </span>
                <span className="mt-1 block text-base leading-relaxed" dir="auto" style={{ fontFamily: FONT_STACKS[f] }}>
                  {t("sample")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("textSize")}</p>
        <div role="radiogroup" aria-label={t("textSize")} className="grid grid-cols-4 gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => choose({ size: s })}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition",
                size === s ? "border-primary bg-primary/15" : "border-border bg-card hover:bg-muted",
              )}
            >
              {t(`sizes.${s}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
