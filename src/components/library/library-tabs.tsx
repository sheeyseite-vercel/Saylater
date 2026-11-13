"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/recordings", key: "recordings" },
  { href: "/ideas", key: "ideas" },
  { href: "/lists", key: "lists" },
  { href: "/notes", key: "notes" },
] as const;

/** Sub-navigation shared by the four "library" pages. */
export function LibraryTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("library")} className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4">
      {TABS.map(({ href, key }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
              active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
