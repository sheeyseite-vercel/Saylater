import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { LogoutButton } from "@/components/auth/logout-button";

// Authoritative server-side check: the middleware only looks for the cookie.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSessionUser())) redirect("/login");
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="brand-gradient bg-clip-text text-lg font-bold text-transparent">SayLater</span>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
