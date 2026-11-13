"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Trash2, X } from "lucide-react";
import { AddBar } from "@/components/ui/add-bar";
import { Button } from "@/components/ui/button";
import { useItems } from "@/features/items/use-items";
import type { ListItem } from "@/features/items/collections";
import { cn } from "@/lib/utils";

export function ListsView({ initial }: { initial: ListItem[] }) {
  const t = useTranslations("lists");
  const { items, create, patch, remove, error } = useItems<ListItem>("lists", initial);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);

  return (
    <div className="space-y-5">
      <AddBar
        placeholder={t("addPlaceholder")}
        label={t("add")}
        onAdd={async (title) => {
          const made = await create({ title });
          if (made) setOpenId(made.id);
          return made;
        }}
      />
      {error && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((list) => {
            const expanded = openId === list.id;
            const doneCount = list.items.filter((i) => i.done).length;
            return (
              <li key={list.id} className="glass rounded-xl">
                <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-start" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : list.id)}>
                  <span dir="auto" className="font-semibold">{list.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">{doneCount}/{list.items.length}</span>
                </button>
                {expanded && (
                  <div className="space-y-3 border-t border-border p-4">
                    <ul className="space-y-1.5">
                      {list.items.map((it, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={it.done}
                            aria-label={it.text}
                            onClick={() => void patch(list.id, { items: list.items.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)) })}
                            className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2", it.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50")}
                          >
                            {it.done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          </button>
                          <span dir="auto" className={cn("flex-1", it.done && "text-muted-foreground line-through")}>{it.text}</span>
                          <button
                            type="button"
                            aria-label={t("removeItem")}
                            onClick={() => void patch(list.id, { items: list.items.filter((_, i) => i !== idx) })}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <AddBar
                      placeholder={t("addItemPlaceholder")}
                      label={t("addItem")}
                      onAdd={(text) => patch(list.id, { items: [...list.items, { text, done: false }] })}
                    />
                    <div className="flex flex-wrap gap-2">
                      {doneCount > 0 && (
                        <Button variant="ghost" className="h-9 w-auto" onClick={() => void patch(list.id, { items: list.items.filter((i) => !i.done) })}>
                          {t("clearDone")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="h-9 w-auto text-destructive"
                        onClick={() => {
                          if (window.confirm(t("confirmDelete"))) void remove(list.id);
                        }}
                      >
                        <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
