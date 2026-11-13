"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { logout } from "@/features/auth/actions";
import { clearPrivateCaches } from "@/features/offline/db";

// Icon-only on phones (text used to wrap and clip in the header), icon + label from tablet up.
export function LogoutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label={t("logout")}
      title={t("logout")}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        await clearPrivateCaches();
        router.replace("/login");
        router.refresh();
      }}
      className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-sm transition hover:bg-muted disabled:opacity-60"
    >
      <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      <span className="hidden md:inline">{t("logout")}</span>
    </button>
  );
}
