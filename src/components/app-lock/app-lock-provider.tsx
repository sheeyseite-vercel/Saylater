"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clearCookieOnly, readLock } from "@/features/app-lock/lock";
import { LockScreen } from "./lock-screen";

interface Ctx {
  enabled: boolean;
  lockNow: () => void;
  /** Re-read the stored config after settings change it. */
  refresh: () => void;
}
const LockContext = createContext<Ctx>({ enabled: false, lockNow: () => undefined, refresh: () => undefined });
export const useAppLock = () => useContext(LockContext);

export function AppLockProvider({
  uid,
  initialLocked,
  children,
}: {
  uid: string;
  initialLocked: boolean;
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(initialLocked);
  const [locked, setLocked] = useState(initialLocked);
  const hiddenAt = useRef<number | null>(null);

  const refresh = useCallback(() => {
    const cfg = readLock(uid);
    setEnabled(cfg !== null);
    if (!cfg) setLocked(false);
  }, [uid]);

  // The cookie only says "a lock was set up on this device". If the local config is gone
  // (site data cleared), there is nothing to unlock with, so drop the lock instead of trapping the user.
  useEffect(() => {
    const cfg = readLock(uid);
    if (!cfg) {
      clearCookieOnly();
      setEnabled(false);
      setLocked(false);
    } else {
      setEnabled(true);
    }
  }, [uid]);

  useEffect(() => {
    const onChange = () => {
      const cfg = readLock(uid);
      if (!cfg) return;
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        if (cfg.timeoutMs === 0) setLocked(true);
      } else if (hiddenAt.current !== null) {
        if (Date.now() - hiddenAt.current >= cfg.timeoutMs) setLocked(true);
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [uid]);

  const value = useMemo<Ctx>(() => ({ enabled, lockNow: () => setLocked(true), refresh }), [enabled, refresh]);

  return (
    <LockContext.Provider value={value}>
      {/* Content stays mounted (a recording in progress is not interrupted) but is hidden and inert. */}
      <div inert={locked} aria-hidden={locked} className={locked ? "invisible" : undefined}>
        {children}
      </div>
      {locked && <LockScreen uid={uid} onUnlock={() => setLocked(false)} />}
    </LockContext.Provider>
  );
}
