"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Library, Mic, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Only pages that exist today. New sections are added here as they ship.
const ITEMS = [
  { href: "/dashboard", key: "dashboard", Icon: LayoutDashboard },
  { href: "/capture", key: "capture", Icon: Mic },
  { href: "/recordings", key: "recordings", Icon: Library },
  { href: "/settings", key: "settings", Icon: Settings },
] as const;

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("main")}
      className={cn(variant === "sidebar" ? "flex flex-col gap-1" : "grid grid-cols-4 gap-1")}
    >
      {ITEMS.map(({ href, key, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl text-sm font-medium transition",
              variant === "sidebar" ? "px-3 py-2.5" : "flex-col gap-1 py-2.5 text-xs",
              active ? "bg-primary/15 text-foreground [&_svg]:text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
