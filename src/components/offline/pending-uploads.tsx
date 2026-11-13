"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { SYNC_CHANGED, listPendingRecordings, removePendingRecording, type PendingRecording } from "@/features/offline/db";
import { flush } from "@/features/offline/sync";
import { formatDuration } from "@/lib/format";
import { useSync } from "./sync-provider";

/** Recordings made offline that have not reached the server yet. */
export function PendingUploads() {
  const t = useTranslations("offline");
  const { uid } = useSync();
  const [items, setItems] = useState<PendingRecording[]>([]);

  useEffect(() => {
    if (!uid) return;
    const load = () => void listPendingRecordings(uid).then(setItems).catch(() => undefined);
    load();
    window.addEventListener(SYNC_CHANGED, load);
    return () => window.removeEventListener(SYNC_CHANGED, load);
  }, [uid]);

  if (!uid || items.length === 0) return null;
  return (
    <section aria-label={t("pendingTitle")} className="space-y-2">
      <h2 className="text-sm font-semibold">{t("pendingTitle")}</h2>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((r) => (
          <li key={r.id} className="flex items-center gap-4 px-1 py-3">
            <span dir="ltr" className="w-12 shrink-0 text-lg font-semibold tabular-nums">{formatDuration(r.durationSeconds)}</span>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="truncate font-medium">{r.title}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {r.error === "quota" ? t("quota") : t("waiting")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("confirmDelete"))) void removePendingRecording(r.id);
              }}
              className="text-sm text-muted-foreground underline"
            >
              {t("remove")}
            </button>
          </li>
        ))}
      </ul>
      {items.some((r) => r.error !== "quota") && (
        <button type="button" onClick={() => void flush(uid)} className="text-sm underline">{t("retryNow")}</button>
      )}
    </section>
  );
}
