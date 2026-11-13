// Client-only. Everything the user changes while offline waits here, on their device, until it can be sent.
export const SYNC_CHANGED = "saylater:sync-changed";
export const SYNCED = "saylater:synced";

export interface QueuedOp {
  seq?: number;
  uid: string;
  collection: string;
  kind: "create" | "patch" | "delete";
  id: string;
  data?: Record<string, unknown>;
  at: number;
}

export interface PendingRecording {
  id: string;
  uid: string;
  blob: Blob;
  mimeType: string;
  title: string;
  durationSeconds: number;
  language: "ar" | "fr" | "en" | null;
  createdAt: number;
  error?: "quota" | "uploadFailed";
}

const DB_NAME = "saylater-sync";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("ops", { keyPath: "seq", autoIncrement: true });
      req.result.createObjectStore("recordings", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: "ops" | "recordings", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const changed = () => window.dispatchEvent(new Event(SYNC_CHANGED));

export async function listOps(uid: string): Promise<QueuedOp[]> {
  const all = await run<QueuedOp[]>("ops", "readonly", (s) => s.getAll());
  return all.filter((o) => o.uid === uid).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}

export async function removeOp(seq: number): Promise<void> {
  await run("ops", "readwrite", (s) => s.delete(seq));
  changed();
}

/** Adds an operation, folding it into earlier ones for the same item so the queue stays small and correct. */
export async function enqueueOp(op: Omit<QueuedOp, "seq" | "at">): Promise<void> {
  const mine = (await listOps(op.uid)).filter((o) => o.collection === op.collection && o.id === op.id);
  const create = mine.find((o) => o.kind === "create");
  const patch = mine.find((o) => o.kind === "patch");

  if (op.kind === "delete") {
    for (const o of mine) await run("ops", "readwrite", (s) => s.delete(o.seq as number));
    if (!create) await run("ops", "readwrite", (s) => s.add({ ...op, at: Date.now() }));
  } else if (op.kind === "patch" && (create || patch)) {
    const target = (create ?? patch) as QueuedOp;
    await run("ops", "readwrite", (s) => s.put({ ...target, data: { ...target.data, ...op.data } }));
  } else {
    await run("ops", "readwrite", (s) => s.add({ ...op, at: Date.now() }));
  }
  changed();
}

export async function enqueueRecording(rec: PendingRecording): Promise<void> {
  await run("recordings", "readwrite", (s) => s.put(rec));
  changed();
}

export async function listPendingRecordings(uid: string): Promise<PendingRecording[]> {
  const all = await run<PendingRecording[]>("recordings", "readonly", (s) => s.getAll());
  return all.filter((r) => r.uid === uid).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingRecording(id: string): Promise<void> {
  await run("recordings", "readwrite", (s) => s.delete(id));
  changed();
}

export async function markRecordingError(id: string, error: PendingRecording["error"]): Promise<void> {
  const all = await run<PendingRecording[]>("recordings", "readonly", (s) => s.getAll());
  const rec = all.find((r) => r.id === id);
  if (rec) await run("recordings", "readwrite", (s) => s.put({ ...rec, error }));
  changed();
}

export async function pendingCount(uid: string): Promise<number> {
  const [ops, recs] = await Promise.all([listOps(uid), listPendingRecordings(uid)]);
  return ops.length + recs.length;
}

/** Cached private pages are removed on sign-out; unsynced changes stay (keyed by user) for the next sign-in. */
export async function clearPrivateCaches(): Promise<void> {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("saylater-pages")).map((k) => caches.delete(k)));
  } catch {
    /* caches unavailable */
  }
}
