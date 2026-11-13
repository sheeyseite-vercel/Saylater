import Link from "next/link";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";
import { AppNav } from "@/components/layout/app-nav";
import { RecButton } from "@/components/layout/rec-button";
import { SyncProvider } from "@/components/offline/sync-provider";
import { AppLockProvider } from "@/components/app-lock/app-lock-provider";
import { LOCK_COOKIE } from "@/features/app-lock/lock";

const Brand = () => (
  <Link href="/dashboard" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
    <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-primary" />
    SayLater
  </Link>
);

// Authoritative server-side check: the middleware only looks for the cookie.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const searchLabel = (await getTranslations("nav"))("search");
  const initialLocked = (await cookies()).get(LOCK_COOKIE)?.value === "1";
  return (
    <AppLockProvider uid={user.uid} initialLocked={initialLocked}>
    <SyncProvider uid={user.uid}>
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-e border-border p-5 md:flex">
        <div className="space-y-8">
          <Brand />
          <AppNav variant="sidebar" />
        </div>
        <RecButton variant="block" />
      </aside>

      <div className="min-w-0 flex-1 pb-28 md:pb-0">
        <header className="flex items-center justify-between px-4 pt-4 md:hidden">
          <Brand />
          <Link href="/search" aria-label={searchLabel} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
        </header>
        {children}
      </div>

      <RecButton variant="fab" />
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <AppNav variant="bottom" />
      </div>
    </div>
    </SyncProvider>
    </AppLockProvider>
  );
}
