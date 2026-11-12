import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone is required by the recorder; camera/geolocation are not.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Keep visited pages in the client router cache so going back or revisiting is instant.
    // Mutations call revalidateRecordings() so lists never show stale data after a change.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be re-checked so updates ship immediately.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
