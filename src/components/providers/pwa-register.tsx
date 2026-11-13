"use client";

import { useEffect } from "react";

export const INSTALL_READY_EVENT = "saylater:install-ready";

/**
 * - Registers the minimal service worker (installability + offline page; it never caches user data).
 * - Captures Chrome's install prompt as early as possible (it can fire before Settings is opened).
 * - Blocks pinch and double-tap zoom inside the app (the text-size setting replaces it).
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      // A new worker took over (an update): reload once so the newest screens are shown, not stale ones.
      let reloaded = false;
      const hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded || !hadController) return;
        reloaded = true;
        window.location.reload();
      });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __saylaterInstall?: Event }).__saylaterInstall = e;
      window.dispatchEvent(new Event(INSTALL_READY_EVENT));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari ignores user-scalable=no, so pinch is cancelled explicitly.
    const stopGesture = (e: Event) => e.preventDefault();
    const stopPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stopGesture);
    document.addEventListener("gesturechange", stopGesture);
    document.addEventListener("touchmove", stopPinch, { passive: false });

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      document.removeEventListener("gesturestart", stopGesture);
      document.removeEventListener("gesturechange", stopGesture);
      document.removeEventListener("touchmove", stopPinch);
    };
  }, []);
  return null;
}
