import type { DogCharacter, DogGender, DogAge } from "@/types/database";

/**
 * Schema for offline-queued sightings stored in IndexedDB.
 *
 * v1 fields (everything required for the replay POST) are unchanged.
 *
 * v2 adds retry-state fields:
 *   - failureCount       — incremented on each non-ok response
 *   - lastFailureStatus  — HTTP status (or 0 for network error)
 *   - lastFailureMessage — optional server error text
 *   - lastAttemptAt      — ISO timestamp of last sync attempt
 *   - dead               — true after 3 consecutive 4xx; sync loop skips
 *
 * v1 entries get these fields backfilled at first open via the
 * onupgradeneeded migration; the SW's openDB() runs the same migration
 * so a deploy that ships v2 SW + v2 page bundle stays in sync.
 */
export interface OfflineDogEntry {
  id?: number;
  dogImage: File | Blob;
  earTagImage?: File | Blob;
  earTagId?: string;
  latitude: number;
  longitude: number;
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes?: string;
  clientUuid?: string;
  createdAt: string;
  // v2 retry metadata — optional on read, defaults applied at write.
  failureCount?: number;
  lastFailureStatus?: number;
  lastFailureMessage?: string;
  lastAttemptAt?: string;
  dead?: boolean;
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

export function uploadFileName(blob: File | Blob, fallback: string): string {
  if (blob instanceof File && blob.name) return blob.name;
  const ext = MIME_EXT[blob.type ?? ""] ?? "jpg";
  return `${fallback}.${ext}`;
}

const DB_NAME = "StreetDogDB";
export const DB_VERSION = 2;
const STORE_NAME = "offlineDogs";

// Max 4xx attempts before an entry is flagged `dead` and stops being
// retried. 5xx + network errors are retried forever (background sync's
// own backoff governs cadence).
export const MAX_PERMANENT_FAILURES = 3;

/**
 * Apply v1 → v2 defaults to every entry already in the store. Adds the
 * retry metadata fields so the rest of the code path can treat them as
 * always-present. Idempotent — re-running it does nothing harmful.
 */
function migrateToV2(store: IDBObjectStore): void {
  const cursorReq = store.openCursor();
  cursorReq.onsuccess = (e) => {
    const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
    if (!cursor) return;
    const value = cursor.value as OfflineDogEntry;
    let dirty = false;
    if (value.failureCount === undefined) {
      value.failureCount = 0;
      dirty = true;
    }
    if (value.dead === undefined) {
      value.dead = false;
      dirty = true;
    }
    if (dirty) cursor.update(value);
    cursor.continue();
  };
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      const tx = target.transaction!;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      // v1 → v2: backfill retry metadata on existing rows.
      if (event.oldVersion < 2) {
        migrateToV2(tx.objectStore(STORE_NAME));
      }
    };
  });
}

export class QuotaExceededError extends Error {
  constructor(
    public used: number,
    public quota: number
  ) {
    super(
      `Local storage almost full (${Math.round(
        (used / Math.max(quota, 1)) * 100
      )}%). Sync before adding more offline catches.`
    );
    this.name = "QuotaExceededError";
  }
}

async function ensureQuotaAvailable(): Promise<void> {
  if (typeof navigator === "undefined") return;
  const storage = navigator.storage;
  if (!storage?.estimate) return;
  try {
    const { usage = 0, quota = 0 } = await storage.estimate();
    if (quota > 0 && usage / quota > 0.9) {
      throw new QuotaExceededError(usage, quota);
    }
  } catch (err) {
    if (err instanceof QuotaExceededError) throw err;
  }
}

export async function saveOfflineDog(
  entry: Omit<OfflineDogEntry, "id">
): Promise<number> {
  await ensureQuotaAvailable();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    // Default retry metadata so reads can always trust failureCount / dead.
    const enriched: Omit<OfflineDogEntry, "id"> = {
      failureCount: 0,
      dead: false,
      ...entry,
    };
    const request = store.add(enriched);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getOfflineDogs(): Promise<OfflineDogEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as OfflineDogEntry[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removeOfflineDog(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Update retry metadata on an entry without rewriting payload fields. */
export async function updateOfflineDogStatus(
  id: number,
  patch: Pick<
    OfflineDogEntry,
    "failureCount" | "lastFailureStatus" | "lastFailureMessage" | "lastAttemptAt" | "dead"
  >
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as OfflineDogEntry | undefined;
      if (!current) {
        db.close();
        resolve();
        return;
      }
      store.put({ ...current, ...patch });
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Replay every pending entry (not yet dead) via /api/sightings POST.
 * Serialised with navigator.locks so a manual "Sync Now" and a
 * background sync-dogs event can't race. Distinguishes 4xx (permanent,
 * count up to MAX_PERMANENT_FAILURES then mark dead) from 5xx / network
 * (transient, leave in queue without bumping the dead counter).
 */
export async function syncOfflineDogs(): Promise<{
  synced: number;
  failed: number;
  dead: number;
}> {
  const run = async () => {
    const dogs = await getOfflineDogs();
    let synced = 0;
    let failed = 0;
    let dead = 0;

    for (const entry of dogs) {
      if (entry.dead || entry.id == null) continue;

      const formData = new FormData();
      formData.append(
        "dogImage",
        entry.dogImage,
        uploadFileName(entry.dogImage, "dog_image")
      );
      if (entry.earTagImage) {
        formData.append(
          "earTagImage",
          entry.earTagImage,
          uploadFileName(entry.earTagImage, "ear_tag")
        );
      }
      if (entry.earTagId) formData.append("earTagId", entry.earTagId);
      formData.append("latitude", String(entry.latitude));
      formData.append("longitude", String(entry.longitude));
      formData.append("character", entry.character);
      formData.append("size", String(entry.size));
      formData.append("gender", entry.gender);
      formData.append("age", entry.age);
      if (entry.notes) formData.append("notes", entry.notes);
      if (entry.clientUuid) formData.append("clientUuid", entry.clientUuid);

      try {
        const res = await fetch("/api/sightings", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          await removeOfflineDog(entry.id);
          synced++;
          continue;
        }

        // 4xx is permanent — bump failureCount and possibly mark dead.
        // 5xx is transient — note the status but don't escalate.
        const isPermanent = res.status >= 400 && res.status < 500;
        const newCount = (entry.failureCount ?? 0) + (isPermanent ? 1 : 0);
        const becomesDead = isPermanent && newCount >= MAX_PERMANENT_FAILURES;
        let errorText = "";
        try {
          const cloned = res.clone();
          const body = await cloned.text();
          if (body.length < 400) errorText = body;
        } catch {
          /* ignore */
        }
        await updateOfflineDogStatus(entry.id, {
          failureCount: newCount,
          lastFailureStatus: res.status,
          lastFailureMessage: errorText || undefined,
          lastAttemptAt: new Date().toISOString(),
          dead: becomesDead,
        });
        if (becomesDead) dead++;
        else failed++;
      } catch {
        // Network error (offline mid-sync, fetch threw). Transient —
        // don't count toward the permanent-failure budget.
        try {
          await updateOfflineDogStatus(entry.id, {
            lastFailureStatus: 0,
            lastAttemptAt: new Date().toISOString(),
          });
        } catch {
          /* ignore */
        }
        failed++;
      }
    }

    return { synced, failed, dead };
  };

  // Serialise concurrent callers so manual "Sync Now" and the background
  // sync-dogs event can't fire overlapping replay loops past the
  // clientUuid dedupe window.
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("sync-dogs", run);
  }
  return run();
}
