import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { listItems } from "@/features/items/server";
import type { NoteItem } from "@/features/items/collections";
import { LibraryTabs } from "@/components/library/library-tabs";
import { NotesView } from "@/components/library/notes-view";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const t = await getTranslations("notes");
  const initial = await listItems<NoteItem>(user.uid, "notes");
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <LibraryTabs />
      <NotesView initial={initial} />
    </main>
  );
}
