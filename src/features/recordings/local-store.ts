// Crash/refresh recovery for in-progress recordings. Chunks are written to IndexedDB as they
// arrive and removed after a successful upload or an explicit discard. Everything is best-effort:
// IndexedDB can be unavailable (private mode, blocked storage), and recording must still work.

export interface LocalSession {
  id: string;
  mimeType: string;
  startedAt: number;
  durationMs: number;
}

interface ChunkRow {
  sessionId: string;
  idx: number;
  data: Blob;
}

const DB_NAME = "saylater-recorder";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("sessions", { keyPath: "id" });
        db.createObjectStore("chunks", { keyPath: ["sessionId", "idx"] });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

const request = <T,>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const done = (t: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

export async function saveSession(session: LocalSession): Promise<void> {
  try {
    const db = await openDb();
    const t = db.transaction("sessions", "readwrite");
    t.objectStore("sessions").put(session);
    await done(t);
  } catch {
    /* best effort */
  }
}

export async function putChunk(sessionId: string, idx: number, data: Blob): Promise<void> {
  try {
    const db = await openDb();
    const t = db.transaction("chunks", "readwrite");
    const row: ChunkRow = { sessionId, idx, data };
    t.objectStore("chunks").put(row);
    await done(t);
  } catch {
    /* best effort */
  }
}

export async function listSessions(): Promise<LocalSession[]> {
  try {
    const db = await openDb();
    const all = await request(db.transaction("sessions").objectStore("sessions").getAll());
    return (all as LocalSession[]).sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function loadSessionBlob(session: LocalSession): Promise<Blob | null> {
  try {
    const db = await openDb();
    const range = IDBKeyRange.bound([session.id, 0], [session.id, Number.MAX_SAFE_INTEGER]);
    const rows = (await request(db.transaction("chunks").objectStore("chunks").getAll(range))) as ChunkRow[];
    if (!rows.length) return null;
    rows.sort((a, b) => a.idx - b.idx);
    return new Blob(rows.map((r) => r.data), { type: session.mimeType });
  } catch {
    return null;
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    const db = await openDb();
    const t = db.transaction(["sessions", "chunks"], "readwrite");
    t.objectStore("sessions").delete(id);
    t.objectStore("chunks").delete(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
    await done(t);
  } catch {
    /* best effort */
  }
}
