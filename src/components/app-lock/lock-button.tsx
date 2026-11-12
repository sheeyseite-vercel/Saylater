"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useAppLock } from "./app-lock-provider";

/** Header shortcut; only visible when app lock is on. */
export function LockButton() {
  const t = useTranslations("lock");
  const { enabled, lockNow } = useAppLock();
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={lockNow}
      aria-label={t("lockNow")}
      title={t("lockNow")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
    >
      <Lock className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
