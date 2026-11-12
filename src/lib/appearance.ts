// Shared by server (cookie validation) and client (settings UI). No server-only imports.
export const FONT_COOKIE = "saylater_font";
export const SIZE_COOKIE = "saylater_size";

export const FONTS = ["default", "cairo", "tajawal", "naskh", "readable", "system"] as const;
export const SIZES = ["sm", "md", "lg", "xl"] as const;
export type FontChoice = (typeof FONTS)[number];
export type SizeChoice = (typeof SIZES)[number];

export const isFont = (v: unknown): v is FontChoice => (FONTS as readonly unknown[]).includes(v);
export const isSize = (v: unknown): v is SizeChoice => (SIZES as readonly unknown[]).includes(v);

// Must match the [data-font] rules in globals.css (used for the live preview in settings).
export const FONT_STACKS: Record<FontChoice, string> = {
  default: "var(--font-inter), var(--font-arabic), system-ui, sans-serif",
  cairo: "var(--font-cairo), system-ui, sans-serif",
  tajawal: "var(--font-tajawal), system-ui, sans-serif",
  naskh: "var(--font-lora), var(--font-naskh), Georgia, serif",
  readable: "var(--font-atkinson), var(--font-arabic), system-ui, sans-serif",
  system: "system-ui, 'Segoe UI', Tahoma, Roboto, sans-serif",
};
