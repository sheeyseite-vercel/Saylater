"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";

export function LogoutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      className="h-9 w-auto"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.replace("/login");
        router.refresh();
      }}
    >
      {t("logout")}
    </Button>
  );
}
