"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CloudOff, RefreshCw } from "lucide-react";
import { SYNCED, SYNC_CHANGED, pendingCount } from "@/features/offline/db";
import { flush } from "@/features/offline/sync";
import { revalidateRecordings } from "@/features/recordings/actions";

const SyncContext = createContext<{ uid: string | null }>({ uid: null });
export const useSync = () => useContext(SyncContext);

/**
 * Keeps the app usable without a connection: shows the offline state, counts what is waiting,
 * and sends it automatically as soon as the connection returns.
 */
export function SyncProvider({ uid, children }: { uid: string; children: React.ReactNode }) {
  const t = useTranslations("offline");
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    const refreshCount = () => void pendingCount(uid).then((n) => alive && setPending(n)).catch(() => undefined);
    const attempt = () => void flush(uid).then(refreshCount);
    const goOnline = () => {
      setOnline(true);
      attempt();
    };
    const goOffline = () => setOnline(false);
    const onSynced = () => {
      void revalidateRecordings().finally(() => router.refresh());
    };
    const onVisible = () => document.visibilityState === "visible" && attempt();

    setOnline(navigator.onLine);
    refreshCount();
    attempt();
    const timer = setInterval(attempt, 30_000); // covers "online" events that never fire

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(SYNC_CHANGED, refreshCount);
    window.addEventListener(SYNCED, onSynced);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(SYNC_CHANGED, refreshCount);
      window.removeEventListener(SYNCED, onSynced);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uid, router]);

  return (
    <SyncContext.Provider value={{ uid }}>
      {(!online || pending > 0) && (
        <div
          role="status"
          className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground"
        >
          {online ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />}
          {online ? t("syncing", { count: pending }) : pending > 0 ? t("offlinePending", { count: pending }) : t("offline")}
        </div>
      )}
      {children}
    </SyncContext.Provider>
  );
}
