import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { FONT_COOKIE, SIZE_COOKIE, isFont, isSize } from "@/lib/appearance";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AppLockSettings } from "@/components/settings/app-lock-settings";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const t = await getTranslations("settings");
  const jar = await cookies();
  const font = jar.get(FONT_COOKIE)?.value;
  const size = jar.get(SIZE_COOKIE)?.value;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <AppearanceSettings initialFont={isFont(font) ? font : "default"} initialSize={isSize(size) ? size : "md"} />
      <AppLockSettings uid={user.uid} />
      <section className="glass space-y-3 rounded-2xl p-5 sm:p-6">
        <h2 className="font-semibold">{t("account")}</h2>
        <p className="text-sm text-muted-foreground">{user.email ?? user.name ?? ""}</p>
        <LogoutButton />
      </section>
    </main>
  );
}
