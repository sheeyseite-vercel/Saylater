"use client";

import { ThemeProvider as NextThemes } from "next-themes";

// Dark is the default; the choice persists in localStorage across sessions.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false} storageKey="saylater-theme">
      {children}
    </NextThemes>
  );
}
