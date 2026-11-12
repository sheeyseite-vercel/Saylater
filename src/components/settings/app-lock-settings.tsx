"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLock } from "@/components/app-lock/app-lock-provider";
import {
  PIN_MAX,
  PIN_MIN,
  TIMEOUTS,
  createLock,
  isValidPin,
  readLock,
  removeLock,
  setTimeoutMs,
  verifyPin,
} from "@/features/app-lock/lock";

const digits = (v: string) => v.replace(/\D/g, "").slice(0, PIN_MAX);
const field = "h-11 w-full rounded-xl border border-border bg-card px-3 text-center tracking-[0.4em]";

export function AppLockSettings({ uid }: { uid: string }) {
  const t = useTranslations("lock");
  const { enabled, lockNow, refresh } = useAppLock();
  const [timeoutMs, setTimeout_] = useState<number>(60_000);
  const [mode, setMode] = useState<"idle" | "setup" | "disable">("idle");
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = readLock(uid);
    if (c) setTimeout_(c.timeoutMs);
  }, [uid, enabled]);

  const reset = () => {
    setMode("idle");
    setPin("");
    setAgain("");
    setError(null);
  };

  async function enable() {
    if (!isValidPin(pin)) return setError(t("invalidPin", { min: PIN_MIN, max: PIN_MAX }));
    if (pin !== again) return setError(t("mismatch"));
    setBusy(true);
    await createLock(uid, pin, timeoutMs);
    setBusy(false);
    refresh();
    reset();
  }

  async function disable() {
    setBusy(true);
    const res = await verifyPin(uid, pin);
    setBusy(false);
    if (!res.ok) return setError(res.waitSeconds > 0 ? t("tooMany", { seconds: res.waitSeconds }) : t("wrongPin"));
    removeLock(uid);
    refresh();
    reset();
  }

  return (
    <section className="glass space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2 text-primary">
          {enabled ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <p className="text-sm font-medium" role="status">{enabled ? t("on") : t("off")}</p>

      {mode === "idle" && !enabled && (
        <Button className="w-auto" onClick={() => setMode("setup")}>{t("enable")}</Button>
      )}

      {mode === "setup" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="new-pin" className="text-sm font-medium">{t("setPin", { min: PIN_MIN, max: PIN_MAX })}</label>
            <input id="new-pin" type="password" inputMode="numeric" autoComplete="off" dir="ltr" value={pin}
              onChange={(e) => { setPin(digits(e.target.value)); setError(null); }} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="again-pin" className="text-sm font-medium">{t("confirmPin")}</label>
            <input id="again-pin" type="password" inputMode="numeric" autoComplete="off" dir="ltr" value={again}
              onChange={(e) => { setAgain(digits(e.target.value)); setError(null); }} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lock-timeout-new" className="text-sm font-medium">{t("autoLock")}</label>
            <select id="lock-timeout-new" value={timeoutMs} onChange={(e) => setTimeout_(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-border bg-card px-3">
              {TIMEOUTS.map((ms) => <option key={ms} value={ms}>{t(`timeouts.${ms}`)}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button className="w-auto" disabled={busy} onClick={() => void enable()}>{t("turnOn")}</Button>
            <Button variant="ghost" className="w-auto" onClick={reset}>{t("cancel")}</Button>
          </div>
        </div>
      )}

      {enabled && mode === "idle" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="lock-timeout" className="text-sm font-medium">{t("autoLock")}</label>
            <select id="lock-timeout" value={timeoutMs}
              onChange={(e) => { const ms = Number(e.target.value); setTimeout_(ms); setTimeoutMs(uid, ms); }}
              className="h-11 w-full rounded-xl border border-border bg-card px-3">
              {TIMEOUTS.map((ms) => <option key={ms} value={ms}>{t(`timeouts.${ms}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="w-auto" onClick={lockNow}>{t("lockNow")}</Button>
            <Button variant="ghost" className="w-auto" onClick={() => setMode("disable")}>{t("turnOff")}</Button>
          </div>
        </div>
      )}

      {mode === "disable" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="cur-pin" className="text-sm font-medium">{t("currentPin")}</label>
            <input id="cur-pin" type="password" inputMode="numeric" autoComplete="off" dir="ltr" value={pin}
              onChange={(e) => { setPin(digits(e.target.value)); setError(null); }} className={field} />
          </div>
          <div className="flex gap-2">
            <Button variant="danger" className="w-auto" disabled={busy || pin.length < PIN_MIN} onClick={() => void disable()}>
              {t("turnOff")}
            </Button>
            <Button variant="ghost" className="w-auto" onClick={reset}>{t("cancel")}</Button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </section>
  );
}
