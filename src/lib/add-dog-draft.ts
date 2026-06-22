/**
 * Persistent draft for the Add-Dog form. Stored in its own IndexedDB so the
 * image blobs survive a refresh / navigation without the localStorage size
 * limit. One record under a fixed key; cleared on successful submit.
 */
export interface AddDogDraft {
  earTagId?: string;
  noEarTag?: boolean;
  location?: { lat: number; lng: number } | null;
  aggressive?: boolean;
  inShelter?: boolean;
  size?: number;
  gender?: string;
  age?: string;
  notes?: string;
  dogImage?: Blob | null;
  earTagImage?: Blob | null;
  updatedAt: number;
}

const DB_NAME = "StreetDogDraftDB";
const STORE = "draft";
const KEY = "current";
// Don't resurrect ancient drafts.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(draft: AddDogDraft): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(draft, KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* best-effort; never block the form */
  }
}

export async function loadDraft(): Promise<AddDogDraft | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await open();
    return await new Promise<AddDogDraft | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const d = req.result as AddDogDraft | undefined;
        db.close();
        if (!d || Date.now() - (d.updatedAt ?? 0) > MAX_AGE_MS) {
          return resolve(null);
        }
        resolve(d);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    /* ignore */
  }
}
