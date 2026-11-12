import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";
import { ACCENT_COOKIE, FONT_COOKIE, SIZE_COOKIE, isAccent, isFont, isSize } from "@/lib/appearance";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AppLockSettings } from "@/components/settings/app-lock-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const t = await getTranslations("settings");
  const jar = await cookies();
  const font = jar.get(FONT_COOKIE)?.value;
  const size = jar.get(SIZE_COOKIE)?.value;
  const accent = jar.get(ACCENT_COOKIE)?.value;

  // The name the user chose lives in their profile document; the sign-in name is only the fallback.
  const profile = await adminDb().doc(`users/${user.uid}`).get();
  const stored = profile.get("displayName");
  const name = (typeof stored === "string" && stored.trim()) || user.name || user.email?.split("@")[0] || "";

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <ProfileSettings initialName={name} email={user.email ?? ""} />
      <AppearanceSettings initialFont={isFont(font) ? font : "default"} initialSize={isSize(size) ? size : "md"} initialAccent={isAccent(accent) ? accent : "blue"} />
      <AppLockSettings uid={user.uid} />
    </main>
  );
}
