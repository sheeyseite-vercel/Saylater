import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { listItems } from "@/features/items/server";
import type { ListItem } from "@/features/items/collections";
import { LibraryTabs } from "@/components/library/library-tabs";
import { ListsView } from "@/components/library/lists-view";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const t = await getTranslations("lists");
  const initial = await listItems<ListItem>(user.uid, "lists");
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <LibraryTabs />
      <ListsView initial={initial} />
    </main>
  );
}
