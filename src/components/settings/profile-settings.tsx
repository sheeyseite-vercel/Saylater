"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

export function ProfileSettings({ initialName, email }: { initialName: string; email: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [saved, setSaved] = useState(initialName);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const changed = name.trim() !== saved && name.trim().length > 0;

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name.trim() }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg({ kind: "error", text: t("nameFailed") });
    setSaved(name.trim());
    setName(name.trim());
    setMsg({ kind: "ok", text: t("nameSaved") });
    router.refresh();
  }

  return (
    <section className="glass space-y-4 rounded-2xl p-5 sm:p-6">
      <h2 className="font-bold">{t("profile")}</h2>
      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && !busy) void save();
        }}
      >
        <label htmlFor="display-name" className="text-sm font-medium">{t("displayName")}</label>
        <div className="flex gap-2">
          <input
            id="display-name"
            value={name}
            maxLength={60}
            autoComplete="name"
            dir="auto"
            onChange={(e) => {
              setName(e.target.value);
              setMsg(null);
            }}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3"
          />
          <Button type="submit" className="w-auto" disabled={!changed || busy}>{t("saveName")}</Button>
        </div>
      </form>
      {msg && (
        <p role={msg.kind === "error" ? "alert" : "status"} className={msg.kind === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
          {msg.text}
        </p>
      )}
      {email && (
        <div className="text-sm">
          <p className="text-muted-foreground">{t("email")}</p>
          <p dir="ltr" className="text-start">{email}</p>
        </div>
      )}
      <LogoutButton />
    </section>
  );
}
