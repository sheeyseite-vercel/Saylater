"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendEmailVerification } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

export function ResendVerification() {
  const t = useTranslations("dashboard");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  return (
    <div className="mt-3 space-y-2">
      <Button
        variant="ghost"
        className="h-9 w-auto"
        disabled={state === "busy" || state === "sent"}
        onClick={async () => {
          setState("busy");
          try {
            const user = firebaseAuth().currentUser;
            if (!user) throw new Error("no current user");
            await sendEmailVerification(user);
            setState("sent");
          } catch {
            setState("error");
          }
        }}
      >
        {t("resend")}
      </Button>
      {state === "sent" && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("resent")}
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t("resendFailed")}
        </p>
      )}
    </div>
  );
}
