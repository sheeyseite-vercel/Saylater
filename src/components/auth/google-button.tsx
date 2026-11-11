"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/features/auth/actions";
import { authErrorKey } from "@/features/auth/auth-errors";

export function GoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("auth");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await signInWithGoogle();
            onSuccess();
          } catch (e) {
            const key = authErrorKey(e);
            if (key !== "errors.popupClosed") setError(key);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("google")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}
