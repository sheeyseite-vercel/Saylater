import {
  Atkinson_Hyperlegible,
  Cairo,
  IBM_Plex_Sans_Arabic,
  Inter,
  Lora,
  Noto_Naskh_Arabic,
  Tajawal,
} from "next/font/google";

// Every family is registered but nothing is preloaded: the browser only downloads the one
// the user actually selected (see the [data-font] rules in globals.css).
const common = { display: "swap", preload: false } as const;

const inter = Inter({ ...common, subsets: ["latin"], variable: "--font-inter", preload: true });
const arabic = IBM_Plex_Sans_Arabic({ ...common, subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", preload: true });
const cairo = Cairo({ ...common, subsets: ["arabic", "latin"], variable: "--font-cairo" });
const tajawal = Tajawal({ ...common, subsets: ["arabic", "latin"], weight: ["400", "500", "700"], variable: "--font-tajawal" });
const naskh = Noto_Naskh_Arabic({ ...common, subsets: ["arabic"], variable: "--font-naskh" });
const lora = Lora({ ...common, subsets: ["latin"], variable: "--font-lora" });
const atkinson = Atkinson_Hyperlegible({ ...common, subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson" });

export const fontVariables = [inter, arabic, cairo, tajawal, naskh, lora, atkinson].map((f) => f.variable).join(" ");
