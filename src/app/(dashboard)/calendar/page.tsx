import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { listItems } from "@/features/items/server";
import type { EventItem, ReminderItem, TaskItem } from "@/features/items/collections";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const t = await getTranslations("calendar");
  const [reminders, events, tasks] = await Promise.all([
    listItems<ReminderItem>(user.uid, "reminders"),
    listItems<EventItem>(user.uid, "events"),
    listItems<TaskItem>(user.uid, "tasks"),
  ]);
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <CalendarView reminders={reminders} events={events} tasks={tasks} />
    </main>
  );
}
