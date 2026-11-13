"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTALL_READY_EVENT } from "@/components/providers/pwa-register";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const stored = () => (window as unknown as { __saylaterInstall?: InstallEvent }).__saylaterInstall ?? null;

export function InstallSettings() {
  const t = useTranslations("install");
  const [standalone, setStandalone] = useState(false);
  const [swActive, setSwActive] = useState<boolean | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setCanPrompt(stored() !== null);
    navigator.serviceWorker
      ?.getRegistration("/")
      .then((r) => setSwActive(Boolean(r?.active)))
      .catch(() => setSwActive(false));

    const ready = () => setCanPrompt(stored() !== null);
    const installed = () => {
      setStandalone(true);
      setCanPrompt(false);
    };
    window.addEventListener(INSTALL_READY_EVENT, ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    const ev = stored();
    if (!ev) return;
    setMsg(null);
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    (window as unknown as { __saylaterInstall?: unknown }).__saylaterInstall = undefined;
    setCanPrompt(false);
    if (outcome === "dismissed") setMsg(t("dismissed"));
  }

  const row = (ok: boolean | null, label: string) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );

  return (
    <section className="glass space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2 text-primary"><Download className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {standalone ? (
        <p className="text-sm font-medium" role="status">{t("installed")}</p>
      ) : (
        <>
          {canPrompt && <Button className="w-auto" onClick={() => void install()}>{t("install")}</Button>}
          {msg && <p className="text-sm text-muted-foreground" role="status">{msg}</p>}

          {!canPrompt && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{ios ? t("iosTitle") : t("manualTitle")}</p>
              <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
                {(ios ? ["ios1", "ios2", "ios3"] : ["android1", "android2", "android3"]).map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ol>
            </div>
          )}

          <ul className="space-y-1 border-t border-border pt-3" aria-label={t("checks")}>
            {row(swActive, t("checkWorker"))}
            {row(canPrompt, t("checkPrompt"))}
          </ul>
          {!canPrompt && !ios && <p className="text-xs text-muted-foreground">{t("tip")}</p>}
        </>
      )}
    </section>
  );
}
