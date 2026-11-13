"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, CalendarDays, Check, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useItems } from "@/features/items/use-items";
import type { EventItem, ReminderItem, TaskItem } from "@/features/items/collections";
import { dayKey, fromLocalInput } from "@/lib/datetime";
import { cn } from "@/lib/utils";

interface Entry {
  key: string;
  kind: "reminder" | "event" | "task";
  id: string;
  title: string;
  at: string;
  endsAt?: string | null;
  done: boolean;
  note?: string;
}

export function CalendarView(props: { reminders: ReminderItem[]; events: EventItem[]; tasks: TaskItem[] }) {
  const t = useTranslations("calendar");
  const reminders = useItems<ReminderItem>("reminders", props.reminders);
  const events = useItems<EventItem>("events", props.events);
  const tasks = useItems<TaskItem>("tasks", props.tasks);

  const [adding, setAdding] = useState<null | "reminder" | "event">(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [until, setUntil] = useState("");
  const [formError, setFormError] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const dayFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }), []);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }), []);
  const now = Date.now();
  const today = dayKey(new Date().toISOString());

  const entries: Entry[] = [
    ...reminders.items.map<Entry>((r) => ({ key: `r${r.id}`, kind: "reminder", id: r.id, title: r.title, at: r.remindAt, done: r.status !== "scheduled", note: r.description })),
    ...events.items.map<Entry>((e) => ({ key: `e${e.id}`, kind: "event", id: e.id, title: e.title, at: e.startsAt, endsAt: e.endsAt, done: new Date(e.endsAt ?? e.startsAt).getTime() < now, note: e.description })),
    ...tasks.items
      .filter((x) => x.dueDate)
      .map<Entry>((x) => ({ key: `t${x.id}`, kind: "task", id: x.id, title: x.title, at: x.dueDate as string, done: x.status === "completed" })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const overdue = entries.filter((e) => !e.done && e.kind !== "event" && new Date(e.at).getTime() < now);
  const upcoming = entries.filter((e) => !e.done && !overdue.includes(e));
  const past = entries.filter((e) => e.done).reverse().slice(0, 40);

  const upcomingByDay = new Map<string, Entry[]>();
  for (const e of upcoming) {
    const k = dayKey(e.at);
    upcomingByDay.set(k, [...(upcomingByDay.get(k) ?? []), e]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const at = fromLocalInput(when);
    if (!title.trim() || !at || !adding) return setFormError(true);
    setFormError(false);
    const ok =
      adding === "reminder"
        ? await reminders.create({ title: title.trim(), remindAt: at })
        : await events.create({ title: title.trim(), startsAt: at, endsAt: fromLocalInput(until) });
    if (ok) {
      setTitle("");
      setWhen("");
      setUntil("");
      setAdding(null);
    }
  }

  const icon = (k: Entry["kind"]) => {
    const C = k === "reminder" ? Bell : k === "event" ? CalendarDays : ListChecks;
    return <C className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
  };

  const row = (e: Entry) => (
    <li key={e.key} className="flex items-start gap-3 py-3">
      <span className="mt-0.5">{icon(e.kind)}</span>
      <div className="min-w-0 flex-1">
        <p dir="auto" className={cn("font-medium", e.done && "text-muted-foreground line-through")}>{e.title}</p>
        <p className="text-xs text-muted-foreground">
          {t(`kinds.${e.kind}`)} · <span dir="ltr">{timeFmt.format(new Date(e.at))}{e.endsAt ? ` – ${timeFmt.format(new Date(e.endsAt))}` : ""}</span>
          {e.done && e.kind === "reminder" && ` · ${t("sent")}`}
        </p>
        {e.note && <p dir="auto" className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{e.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {e.kind === "reminder" && !e.done && (
          <button type="button" aria-label={t("markDone")} title={t("markDone")} onClick={() => void reminders.patch(e.id, { status: "dismissed" })} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {e.kind === "task" && (
          <button type="button" aria-label={t("markDone")} title={t("markDone")} onClick={() => void tasks.patch(e.id, { status: e.done ? "pending" : "completed" })} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {e.kind !== "task" && (
          <button
            type="button"
            aria-label={t("delete")}
            title={t("delete")}
            onClick={() => {
              if (!window.confirm(t("confirmDelete"))) return;
              void (e.kind === "reminder" ? reminders.remove(e.id) : events.remove(e.id));
            }}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );

  const anyError = reminders.error || events.error || tasks.error;

  return (
    <div className="space-y-6">
      {adding === null ? (
        <div className="flex flex-wrap gap-2">
          <Button className="w-auto" onClick={() => setAdding("reminder")}><Bell className="me-2 h-4 w-4" aria-hidden="true" />{t("addReminder")}</Button>
          <Button variant="ghost" className="w-auto" onClick={() => setAdding("event")}><CalendarDays className="me-2 h-4 w-4" aria-hidden="true" />{t("addEvent")}</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="glass space-y-3 rounded-xl p-4">
          <p className="font-semibold">{adding === "reminder" ? t("addReminder") : t("addEvent")}</p>
          <input aria-label={t("titleLabel")} placeholder={t("titleLabel")} value={title} maxLength={200} dir="auto" onChange={(e) => setTitle(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-card px-3" />
          <div className={cn("grid gap-3", adding === "event" && "sm:grid-cols-2")}>
            <label className="block text-sm">
              <span className="text-muted-foreground">{adding === "reminder" ? t("remindAt") : t("starts")} *</span>
              <input type="datetime-local" dir="ltr" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3" />
            </label>
            {adding === "event" && (
              <label className="block text-sm">
                <span className="text-muted-foreground">{t("ends")}</span>
                <input type="datetime-local" dir="ltr" value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3" />
              </label>
            )}
          </div>
          {formError && <p role="alert" className="text-sm text-destructive">{t("needFields")}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="w-auto">{t("save")}</Button>
            <Button type="button" variant="ghost" className="w-auto" onClick={() => { setAdding(null); setFormError(false); }}>{t("cancel")}</Button>
          </div>
        </form>
      )}
      {anyError && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-destructive">{t("overdue")}</h2>
          <ul className="divide-y divide-border border-y border-border">{overdue.map(row)}</ul>
        </section>
      )}

      {upcoming.length === 0 && overdue.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        [...upcomingByDay.entries()].map(([k, list]) => (
          <section key={k}>
            <h2 className="mb-1 text-sm font-semibold">
              {k === today ? `${t("today")} · ` : ""}
              {dayFmt.format(new Date(list[0]!.at))}
            </h2>
            <ul className="divide-y divide-border border-y border-border">{list.map(row)}</ul>
          </section>
        ))
      )}

      {past.length > 0 && (
        <section>
          <button type="button" aria-expanded={showPast} onClick={() => setShowPast((v) => !v)} className="text-sm text-muted-foreground underline">
            {showPast ? t("hidePast") : t("showPast", { count: past.length })}
          </button>
          {showPast && <ul className="mt-2 divide-y divide-border border-y border-border">{past.map(row)}</ul>}
        </section>
      )}
    </div>
  );
}
