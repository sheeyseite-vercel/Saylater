import { ImageResponse } from "next/og";

/** SayLater mark: a microphone on the orange gradient. `maskable` keeps the glyph inside the safe zone. */
export function brandIcon(size: number, opts: { maskable?: boolean } = {}) {
  const radius = opts.maskable ? 0 : Math.round(size * 0.22);
  const glyph = Math.round(size * (opts.maskable ? 0.46 : 0.58));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          background: "linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" fill="#ffffff" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
