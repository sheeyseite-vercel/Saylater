import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { SearchView } from "@/components/search/search-view";

export default async function SearchPage() {
  if (!(await getSessionUser())) redirect("/login");
  const t = await getTranslations("search");
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <SearchView />
    </main>
  );
}
