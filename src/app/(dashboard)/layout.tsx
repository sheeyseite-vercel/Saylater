import Link from "next/link";
import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";
import { RecButton } from "@/components/layout/rec-button";
import { SyncProvider } from "@/components/offline/sync-provider";
import { AppLockProvider } from "@/components/app-lock/app-lock-provider";
import { LOCK_COOKIE } from "@/features/app-lock/lock";

// Authoritative server-side check: the middleware only looks for the cookie.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const settingsLabel = (await getTranslations("nav"))("settings");
  const initialLocked = (await cookies()).get(LOCK_COOKIE)?.value === "1";
  return (
    <AppLockProvider uid={user.uid} initialLocked={initialLocked}>
      <SyncProvider uid={user.uid}>
        <div className="mx-auto min-h-dvh max-w-3xl pb-28">
          <header className="flex items-center justify-between px-4 pt-4">
            <Link href="/recordings" className="text-xl font-semibold tracking-tight">
              SayLater
            </Link>
            <Link href="/settings" aria-label={settingsLabel} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          </header>
          {children}
        </div>
        <RecButton variant="fab" />
      </SyncProvider>
    </AppLockProvider>
  );
}
