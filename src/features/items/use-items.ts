"use client";

import { useCallback, useState } from "react";
import type { CollectionName } from "./collections";

/** Optimistic CRUD against /api/items. Failed writes roll back and surface `error`. */
export function useItems<T extends { id: string }>(collection: CollectionName, initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [error, setError] = useState(false);

  const create = useCallback(
    async (data: Record<string, unknown>): Promise<T | null> => {
      setError(false);
      const res = await fetch(`/api/items/${collection}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => null);
      if (!res?.ok) {
        setError(true);
        return null;
      }
      const { item } = (await res.json()) as { item: T };
      setItems((prev) => [item, ...prev]);
      return item;
    },
    [collection],
  );

  const patch = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      setError(false);
      let before: T | undefined;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          before = it;
          return { ...it, ...data };
        }),
      );
      const res = await fetch(`/api/items/${collection}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => null);
      if (!res?.ok) {
        setError(true);
        if (before) setItems((prev) => prev.map((it) => (it.id === id ? (before as T) : it)));
      }
      return Boolean(res?.ok);
    },
    [collection],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(false);
      let removed: { item: T; index: number } | undefined;
      setItems((prev) => {
        const index = prev.findIndex((it) => it.id === id);
        if (index >= 0) removed = { item: prev[index] as T, index };
        return prev.filter((it) => it.id !== id);
      });
      const res = await fetch(`/api/items/${collection}/${id}`, { method: "DELETE" }).catch(() => null);
      if (!res?.ok) {
        setError(true);
        const r = removed;
        if (r) setItems((prev) => [...prev.slice(0, r.index), r.item, ...prev.slice(r.index)]);
      }
      return Boolean(res?.ok);
    },
    [collection],
  );

  return { items, create, patch, remove, error, clearError: () => setError(false) };
}
