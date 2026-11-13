"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star, Trash2 } from "lucide-react";
import { AddBar } from "@/components/ui/add-bar";
import { Button } from "@/components/ui/button";
import { useItems } from "@/features/items/use-items";
import type { IdeaItem } from "@/features/items/collections";
import { cn } from "@/lib/utils";

export function IdeasView({ initial }: { initial: IdeaItem[] }) {
  const t = useTranslations("ideas");
  const { items, create, patch, remove, error } = useItems<IdeaItem>("ideas", initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const shown = items.filter((i) => !onlyFav || i.favorite);

  return (
    <div className="space-y-5">
      <AddBar placeholder={t("addPlaceholder")} label={t("add")} onAdd={(title) => create({ title })} />
      {error && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
        {t("onlyFavorites")}
      </label>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((idea) => {
            const expanded = openId === idea.id;
            return (
              <li key={idea.id} className="py-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-pressed={idea.favorite}
                    aria-label={t("favorite")}
                    onClick={() => void patch(idea.id, { favorite: !idea.favorite })}
                    className="mt-0.5 shrink-0"
                  >
                    <Star className={cn("h-5 w-5", idea.favorite ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  </button>
                  <button type="button" className="min-w-0 flex-1 text-start" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : idea.id)}>
                    <span dir="auto" className="block font-medium">{idea.title}</span>
                    {idea.description && !expanded && (
                      <span dir="auto" className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{idea.description}</span>
                    )}
                    {idea.tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {idea.tags.map((tag) => (
                          <span key={tag} dir="auto" className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
                        ))}
                      </span>
                    )}
                  </button>
                </div>
                {expanded && (
                  <div className="mt-3 space-y-3 ps-8">
                    <input
                      aria-label={t("titleLabel")}
                      defaultValue={idea.title}
                      dir="auto"
                      maxLength={200}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== idea.title) void patch(idea.id, { title: v });
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-card px-3"
                    />
                    <textarea
                      aria-label={t("details")}
                      placeholder={t("details")}
                      defaultValue={idea.description}
                      dir="auto"
                      rows={3}
                      maxLength={2000}
                      onBlur={(e) => {
                        if (e.target.value !== idea.description) void patch(idea.id, { description: e.target.value });
                      }}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    />
                    <input
                      aria-label={t("tags")}
                      placeholder={t("tagsHint")}
                      defaultValue={idea.tags.join(", ")}
                      dir="auto"
                      onBlur={(e) => {
                        const tags = e.target.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean).slice(0, 10);
                        if (tags.join("|") !== idea.tags.join("|")) void patch(idea.id, { tags });
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    />
                    <Button
                      variant="ghost"
                      className="h-9 w-auto text-destructive"
                      onClick={() => {
                        if (window.confirm(t("confirmDelete"))) void remove(idea.id);
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
