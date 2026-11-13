"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "checking" | "unsupported" | "denied" | "off" | "on";

function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationSettings() {
  const t = useTranslations("notifications");
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/key");
      if (!keyRes.ok) throw new Error("key");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe");
      setState("on");
    } catch {
      setMsg({ kind: "error", text: t("enableFailed") });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setMsg({ kind: "error", text: t("disableFailed") });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/push/test", { method: "POST" }).catch(() => null);
    setBusy(false);
    const body = res?.ok ? ((await res.json()) as { sent: number }) : null;
    setMsg(body && body.sent > 0 ? { kind: "ok", text: t("testSent") } : { kind: "error", text: t("testFailed") });
  }

  return (
    <section className="glass space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2 text-primary"><Bell className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {state === "unsupported" && <p className="text-sm text-muted-foreground" role="status">{t("unsupported")}</p>}
      {state === "denied" && <p className="text-sm text-destructive" role="status">{t("denied")}</p>}
      {state === "off" && <Button className="w-auto" disabled={busy} onClick={() => void enable()}>{t("enable")}</Button>}
      {state === "on" && (
        <div className="space-y-3">
          <p className="text-sm font-medium" role="status">{t("on")}</p>
          <div className="flex flex-wrap gap-2">
            <Button className="w-auto" disabled={busy} onClick={() => void test()}>{t("test")}</Button>
            <Button variant="ghost" className="w-auto" disabled={busy} onClick={() => void disable()}>{t("disable")}</Button>
          </div>
        </div>
      )}
      {msg && <p role={msg.kind === "error" ? "alert" : "status"} className={msg.kind === "error" ? "text-sm text-destructive" : "text-sm text-success"}>{msg.text}</p>}
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </section>
  );
}
