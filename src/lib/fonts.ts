import {
  Atkinson_Hyperlegible,
  Cairo,
  IBM_Plex_Sans_Arabic,
  Inter,
  Lora,
  Noto_Naskh_Arabic,
  Tajawal,
} from "next/font/google";

// next/font needs literal options (no spread or shared variables). Only the two default
// families are preloaded; the others download only when the user selects them in Settings.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap", preload: false });
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700"], variable: "--font-tajawal", display: "swap", preload: false });
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-naskh", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap", preload: false });

export const fontVariables = [inter, arabic, cairo, tajawal, naskh, lora, atkinson].map((f) => f.variable).join(" ");
