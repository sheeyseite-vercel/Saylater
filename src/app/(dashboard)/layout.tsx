import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AppNav } from "@/components/layout/app-nav";
import { AppLockProvider } from "@/components/app-lock/app-lock-provider";
import { LockButton } from "@/components/app-lock/lock-button";
import { LOCK_COOKIE } from "@/features/app-lock/lock";
import { LogoutButton } from "@/components/auth/logout-button";

const Brand = () => (
  <Link href="/dashboard" className="brand-gradient bg-clip-text text-xl font-bold text-transparent">
    SayLater
  </Link>
);

const Controls = () => (
  <div className="flex items-center gap-2">
    <div className="hidden sm:block">
      <LocaleSwitcher />
    </div>
    <ThemeToggle />
    <LockButton />
    <LogoutButton />
  </div>
);

// Authoritative server-side check: the middleware only looks for the cookie.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const initialLocked = (await cookies()).get(LOCK_COOKIE)?.value === "1";
  return (
    <AppLockProvider uid={user.uid} initialLocked={initialLocked}>
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-e border-border p-4 md:flex">
        <div className="space-y-6">
          <Brand />
          <AppNav variant="sidebar" />
        </div>
        <Controls />
      </aside>

      <div className="min-w-0 flex-1 pb-28 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur md:hidden">
          <Brand />
          <Controls />
        </header>
        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <AppNav variant="bottom" />
      </div>
    </div>
    </AppLockProvider>
  );
}
