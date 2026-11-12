import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { isRtl, type Locale } from "@/i18n/config";
import { PwaRegister } from "@/components/providers/pwa-register";
import { ACCENT_COOKIE, FONT_COOKIE, SIZE_COOKIE, isAccent, isFont, isSize } from "@/lib/appearance";
import { fontVariables } from "@/lib/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "SayLater", template: "%s · SayLater" },
  description: "Speak it. We'll organize it.",
  applicationName: "SayLater",
  appleWebApp: { capable: true, title: "SayLater", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  viewportFit: "cover", // lets the bottom bar respect phone safe areas
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e1118" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const jar = await cookies();
  const font = jar.get(FONT_COOKIE)?.value;
  const size = jar.get(SIZE_COOKIE)?.value;
  const accent = jar.get(ACCENT_COOKIE)?.value;

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={fontVariables}
      data-font={isFont(font) ? font : "default"}
      data-accent={isAccent(accent) ? accent : "blue"}
      data-size={isSize(size) ? size : "md"}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
