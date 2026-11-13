"use client";

import { useCallback, useEffect, useState } from "react";
import { createSchemas, type CollectionName } from "./collections";
import { enqueueOp, listOps } from "@/features/offline/db";
import { useSync } from "@/components/offline/sync-provider";

type Json = Record<string, unknown>;

/**
 * CRUD against /api/items that keeps working offline: changes show instantly, are queued on the
 * device when there is no connection (or the request cannot reach the server), and are sent later.
 * A request the server actively rejects is rolled back and reported.
 */
export function useItems<T extends { id: string }>(collection: CollectionName, initial: T[]) {
  const { uid } = useSync();
  const [items, setItems] = useState<T[]>(initial);
  const [error, setError] = useState(false);

  // Server data + anything still waiting in the offline queue, so a reload never "loses" pending work.
  useEffect(() => {
    let alive = true;
    (async () => {
      let out = [...initial];
      if (uid) {
        for (const op of (await listOps(uid)).filter((o) => o.collection === collection)) {
          if (op.kind === "create") {
            if (!out.some((i) => i.id === op.id)) out = [{ id: op.id, createdAt: new Date(op.at).toISOString(), ...op.data } as unknown as T, ...out];
          } else if (op.kind === "patch") out = out.map((i) => (i.id === op.id ? ({ ...i, ...op.data } as T) : i));
          else out = out.filter((i) => i.id !== op.id);
        }
      }
      if (alive) setItems(out);
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [initial, uid, collection]);

  /** true = delivered; false = rejected by the server; "queued" = saved on the device for later. */
  const send = useCallback(async (kind: "create" | "patch" | "delete", id: string, data?: Json): Promise<boolean | "queued"> => {
    const queue = async () => {
      if (!uid) return false;
      await enqueueOp({ uid, collection, kind, id, data });
      return "queued" as const;
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) return queue();
    const base = `/api/items/${collection}`;
    try {
      const res =
        kind === "create"
          ? await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...data }) })
          : kind === "patch"
            ? await fetch(`${base}/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })
            : await fetch(`${base}/${id}`, { method: "DELETE" });
      if (res.ok) return true;
      if (res.status >= 500 || res.status === 429) return queue(); // server trouble: keep the change, retry later
      return false;
    } catch {
      return queue(); // could not reach the server
    }
  }, [uid, collection]);

  const create = useCallback(
    async (data: Json): Promise<T | null> => {
      setError(false);
      const parsed = createSchemas[collection].safeParse(data);
      if (!parsed.success) {
        setError(true);
        return null;
      }
      const id = crypto.randomUUID();
      const item = { id, ...parsed.data, sourceRecordingId: null, createdAt: new Date().toISOString() } as unknown as T;
      setItems((prev) => [item, ...prev]);
      const ok = await send("create", id, parsed.data as Json);
      if (ok === false) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setError(true);
        return null;
      }
      return item;
    },
    [collection, send],
  );

  const patch = useCallback(
    async (id: string, data: Json) => {
      setError(false);
      let before: T | undefined;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          before = it;
          return { ...it, ...data };
        }),
      );
      const ok = await send("patch", id, data);
      if (ok === false) {
        setError(true);
        if (before) setItems((prev) => prev.map((it) => (it.id === id ? (before as T) : it)));
      }
      return ok !== false;
    },
    [send],
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
      const ok = await send("delete", id);
      if (ok === false) {
        setError(true);
        const r = removed;
        if (r) setItems((prev) => [...prev.slice(0, r.index), r.item, ...prev.slice(r.index)]);
      }
      return ok !== false;
    },
    [send],
  );

  return { items, create, patch, remove, error, clearError: () => setError(false) };
}
