"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { PIN_MAX, PIN_MIN, readLock, removeLock, verifyPin } from "@/features/app-lock/lock";

export function LockScreen({ uid, onUnlock }: { uid: string; onUnlock: () => void }) {
  const t = useTranslations("lock");
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmForgot, setConfirmForgot] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const length = readLock(uid)?.length ?? PIN_MAX;

  useEffect(() => input.current?.focus(), []);

  async function submit(value: string) {
    if (busy || value.length < PIN_MIN) return;
    setBusy(true);
    const res = await verifyPin(uid, value);
    setBusy(false);
    if (res.ok) return onUnlock();
    setPin("");
    setError(res.waitSeconds > 0 ? t("tooMany", { seconds: res.waitSeconds }) : t("wrongPin"));
    input.current?.focus();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("locked")}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background px-6"
    >
      <div className="sticker flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Lock className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">{t("locked")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("enterPin")}</p>
      </div>

      <form
        className="w-full max-w-xs space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(pin);
        }}
      >
        <label htmlFor="pin" className="sr-only">{t("enterPin")}</label>
        <input
          ref={input}
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PIN_MAX}
          value={pin}
          disabled={busy}
          dir="ltr"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, PIN_MAX);
            setPin(v);
            setError(null);
            if (v.length === length) void submit(v);
          }}
          className="h-14 w-full rounded-xl border border-border bg-card text-center text-2xl tracking-[0.5em]"
        />
        <div className="min-h-5 text-center text-sm text-destructive" role="alert">{error}</div>
        <Button type="submit" disabled={busy || pin.length < PIN_MIN}>{t("unlock")}</Button>
      </form>

      {!confirmForgot ? (
        <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setConfirmForgot(true)}>
          {t("forgot")}
        </button>
      ) : (
        <div className="max-w-xs space-y-2 text-center text-sm">
          <p>{t("forgotConfirm")}</p>
          <Button
            variant="danger"
            className="h-10"
            onClick={async () => {
              removeLock(uid);
              await logout();
              router.replace("/login");
              router.refresh();
            }}
          >
            {t("forgotYes")}
          </Button>
        </div>
      )}
    </div>
  );
}
