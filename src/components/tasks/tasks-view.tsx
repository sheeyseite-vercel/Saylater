"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { AddBar } from "@/components/ui/add-bar";
import { Button } from "@/components/ui/button";
import { useItems } from "@/features/items/use-items";
import type { TaskItem } from "@/features/items/collections";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const PRIORITY_DOT = { high: "bg-destructive", medium: "bg-primary", low: "bg-muted-foreground" } as const;

export function TasksView({ initial }: { initial: TaskItem[] }) {
  const t = useTranslations("tasks");
  const { items, create, patch, remove, error } = useItems<TaskItem>("tasks", initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), []);

  const open = items
    .filter((x) => x.status === "pending")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const done = items.filter((x) => x.status === "completed");

  const row = (task: TaskItem) => {
    const expanded = openId === task.id;
    const overdue = task.status === "pending" && task.dueDate !== null && new Date(task.dueDate).getTime() < Date.now();
    return (
      <li key={task.id} className="py-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={task.status === "completed"}
            aria-label={task.title}
            onClick={() => void patch(task.id, { status: task.status === "completed" ? "pending" : "completed" })}
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition",
              task.status === "completed" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 hover:border-primary",
            )}
          >
            {task.status === "completed" && <Check className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setOpenId(expanded ? null : task.id)} aria-expanded={expanded}>
            <span dir="auto" className={cn("block font-medium", task.status === "completed" && "text-muted-foreground line-through")}>
              {task.title}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[task.priority])} />
                {t(`priority.${task.priority}`)}
              </span>
              {task.dueDate && (
                <span className={cn(overdue && "font-medium text-destructive")}>
                  {overdue ? `${t("overdue")} · ` : ""}
                  {fmt.format(new Date(task.dueDate))}
                </span>
              )}
            </span>
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 ps-9">
            <input
              aria-label={t("titleLabel")}
              defaultValue={task.title}
              dir="auto"
              maxLength={200}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== task.title) void patch(task.id, { title: v });
              }}
              className="h-10 w-full rounded-lg border border-border bg-card px-3"
            />
            <textarea
              aria-label={t("details")}
              placeholder={t("details")}
              defaultValue={task.description}
              dir="auto"
              rows={2}
              maxLength={2000}
              onBlur={(e) => {
                if (e.target.value !== task.description) void patch(task.id, { description: e.target.value });
              }}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">{t("due")}</span>
                <input
                  type="datetime-local"
                  dir="ltr"
                  defaultValue={toLocalInput(task.dueDate)}
                  onChange={(e) => void patch(task.id, { dueDate: fromLocalInput(e.target.value) })}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">{t("priorityLabel")}</span>
                <select
                  value={task.priority}
                  onChange={(e) => void patch(task.id, { priority: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3"
                >
                  {(["low", "medium", "high"] as const).map((p) => (
                    <option key={p} value={p}>{t(`priority.${p}`)}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              variant="ghost"
              className="h-9 w-auto text-destructive"
              onClick={() => {
                if (window.confirm(t("confirmDelete"))) void remove(task.id);
              }}
            >
              <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
              {t("delete")}
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <AddBar placeholder={t("addPlaceholder")} label={t("add")} onAdd={(title) => create({ title })} />
      {error && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}

      {open.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">{open.map(row)}</ul>
      )}

      {done.length > 0 && (
        <section>
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ChevronDown className={cn("h-4 w-4 transition", showDone && "rotate-180")} aria-hidden="true" />
            {t("completed", { count: done.length })}
          </button>
          {showDone && <ul className="mt-2 divide-y divide-border border-y border-border">{done.map(row)}</ul>}
        </section>
      )}
    </div>
  );
}
