"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one thing this app is for, always one tap away. Hidden on the recording screen itself. */
export function RecButton({ variant }: { variant: "fab" | "block" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  if (pathname.startsWith("/capture")) return null;
  return (
    <Link
      href="/capture"
      className={cn(
        "sticker inline-flex items-center justify-center gap-2 bg-primary font-bold text-primary-foreground",
        variant === "fab"
          ? "fixed end-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 h-14 rounded-full px-5 md:hidden"
          : "h-12 w-full rounded-xl",
      )}
    >
      <Mic className="h-5 w-5" aria-hidden="true" />
      {t("capture")}
    </Link>
  );
}
