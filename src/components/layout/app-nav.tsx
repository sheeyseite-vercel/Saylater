"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Library, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Recording lives on its own always-visible button (RecButton), so it is not a tab.
const ITEMS = [
  { href: "/dashboard", key: "dashboard", Icon: LayoutDashboard },
  { href: "/recordings", key: "recordings", Icon: Library },
  { href: "/settings", key: "settings", Icon: Settings },
] as const;

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const bottom = variant === "bottom";

  return (
    <nav aria-label={t("main")} className={cn(bottom ? "grid grid-cols-3" : "flex flex-col")}>
      {ITEMS.map(({ href, key, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 text-sm transition-colors",
              bottom ? "flex-col gap-1 pb-1 pt-2 text-xs" : "border-s-[3px] px-3 py-2.5",
              !bottom && (active ? "border-primary" : "border-transparent hover:bg-muted/60"),
              active ? "font-bold text-foreground" : "text-muted-foreground",
            )}
          >
            {bottom && active && <span aria-hidden="true" className="absolute inset-x-5 -top-2 h-[3px] bg-primary" />}
            <Icon className={cn("h-5 w-5", active && "text-primary")} aria-hidden="true" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
