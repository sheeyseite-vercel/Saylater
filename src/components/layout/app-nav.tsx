"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, CheckSquare, LayoutDashboard, Library, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Recording lives on its own always-visible button (RecButton), so it is not a tab.
const ITEMS = [
  { href: "/dashboard", key: "dashboard", Icon: LayoutDashboard, match: ["/dashboard"] },
  { href: "/tasks", key: "tasks", Icon: CheckSquare, match: ["/tasks"] },
  { href: "/calendar", key: "calendar", Icon: CalendarDays, match: ["/calendar"] },
  { href: "/recordings", key: "library", Icon: Library, match: ["/recordings", "/ideas", "/lists", "/notes"] },
  { href: "/search", key: "search", Icon: Search, match: ["/search"], desktopOnly: true },
  { href: "/settings", key: "settings", Icon: Settings, match: ["/settings"] },
] as const;

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const bottom = variant === "bottom";
  const items = ITEMS.filter((i) => !(bottom && "desktopOnly" in i && i.desktopOnly));

  return (
    <nav aria-label={t("main")} className={cn(bottom ? "grid grid-cols-5" : "flex flex-col")}>
      {items.map(({ href, key, Icon, match }) => {
        const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 text-sm transition-colors",
              bottom ? "flex-col gap-1 pb-1 pt-2 text-[11px]" : "border-s-[3px] px-3 py-2.5",
              !bottom && (active ? "border-primary" : "border-transparent hover:bg-muted/60"),
              active ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {bottom && active && <span aria-hidden="true" className="absolute inset-x-4 -top-2 h-[3px] rounded-full bg-primary" />}
            <Icon className={cn("h-5 w-5", active && "text-primary")} aria-hidden="true" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
