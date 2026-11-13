/* SayLater service worker.
 * Offline strategy:
 *  - static assets (/_next/static, icons, fonts): cache-first
 *  - pages + RSC payloads (GET, same-origin, not /api): network-first with a short timeout,
 *    falling back to the last cached copy, then /offline.html
 *  - /api and every non-GET request are never cached (data is kept by the app in IndexedDB)
 * Cached pages are the signed-in user's own pages and live only on this device. */
const VERSION = "v2";
const STATIC = "saylater-static-" + VERSION;
const PAGES = "saylater-pages-" + VERSION;
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 60;
const NET_TIMEOUT = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_PAGES; i++) await cache.delete(keys[i]);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function networkFirst(request, fallbackToShell) {
  const cache = await caches.open(PAGES);
  try {
    const res = await withTimeout(fetch(request), NET_TIMEOUT);
    if (res && res.ok && !res.redirected) {
      cache.put(request, res.clone()).then(() => trim(cache)).catch(() => {});
    }
    return res;
  } catch (e) {
    const hit = await cache.match(request, { ignoreVary: true });
    if (hit) return hit;
    if (fallbackToShell) {
      const shell = await caches.match(OFFLINE_URL);
      if (shell) return shell;
    }
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === OFFLINE_URL
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, true));
    return;
  }
  // RSC payloads / prefetches for client-side navigation
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(req, false));
  }
});

// Web Push: a reminder arrived. Only the text the server sent is shown.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "SayLater", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/calendar" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/calendar";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          if ("navigate" in c) c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
