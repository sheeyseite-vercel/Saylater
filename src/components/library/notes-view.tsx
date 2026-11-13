"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { AddBar } from "@/components/ui/add-bar";
import { Button } from "@/components/ui/button";
import { useItems } from "@/features/items/use-items";
import type { NoteItem } from "@/features/items/collections";

export function NotesView({ initial }: { initial: NoteItem[] }) {
  const t = useTranslations("notes");
  const { items, create, patch, remove, error } = useItems<NoteItem>("notes", initial);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <AddBar placeholder={t("addPlaceholder")} label={t("add")} onAdd={(title) => create({ title })} />
      {error && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((n) => {
            const expanded = openId === n.id;
            return (
              <li key={n.id} className="py-3">
                <button type="button" className="w-full text-start" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : n.id)}>
                  <span dir="auto" className="block font-medium">{n.title}</span>
                  {n.description && !expanded && (
                    <span dir="auto" className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.description}</span>
                  )}
                </button>
                {expanded && (
                  <div className="mt-3 space-y-3">
                    <input
                      aria-label={t("titleLabel")}
                      defaultValue={n.title}
                      dir="auto"
                      maxLength={200}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== n.title) void patch(n.id, { title: v });
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-card px-3"
                    />
                    <textarea
                      aria-label={t("body")}
                      placeholder={t("body")}
                      defaultValue={n.description}
                      dir="auto"
                      rows={6}
                      maxLength={20000}
                      onBlur={(e) => {
                        if (e.target.value !== n.description) void patch(n.id, { description: e.target.value });
                      }}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed"
                    />
                    <Button
                      variant="ghost"
                      className="h-9 w-auto text-destructive"
                      onClick={() => {
                        if (window.confirm(t("confirmDelete"))) void remove(n.id);
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                      {t("delete")}
                    </Button>
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
