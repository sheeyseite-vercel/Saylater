"use client";

import { useEffect, useRef } from "react";

const BARS = 40;

/** Live level bars drawn from an AnalyserNode. Flat and quiet when `active` is false. */
export function Waveform({ analyser, active }: { analyser: AnalyserNode | null; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = el.clientWidth;
    const h = el.clientHeight;
    el.width = w * dpr;
    el.height = h * dpr;
    ctx.scale(dpr, dpr);

    const hsl = getComputedStyle(el).getPropertyValue("--primary").trim();
    const color = hsl ? `hsl(${hsl})` : "#7c6cf0";
    const data = new Uint8Array(analyser?.frequencyBinCount ?? 0);
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (analyser && active) analyser.getByteFrequencyData(data);
      const gap = 3;
      const bw = (w - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i++) {
        const v = analyser && active && data.length ? (data[Math.floor((i / BARS) * data.length * 0.7)] ?? 0) / 255 : 0;
        const bh = Math.max(4, v * h);
        ctx.fillStyle = color;
        ctx.globalAlpha = active ? 0.55 + v * 0.45 : 0.3;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), (h - bh) / 2, bw, bh, bw / 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, active]);

  return <canvas ref={canvas} aria-hidden="true" className="h-20 w-full" />;
}
