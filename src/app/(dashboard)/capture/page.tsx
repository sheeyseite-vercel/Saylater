import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { RecorderPanel } from "@/components/audio/recorder-panel";

export default async function CapturePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const t = await getTranslations("capture");
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <RecorderPanel uid={user.uid} />
    </main>
  );
}
