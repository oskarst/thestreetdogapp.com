import type { DogCharacter, DogGender, DogAge } from "@/types/database";

export interface OfflineDogEntry {
  id?: number;
  dogImage: Blob;
  earTagImage?: Blob;
  earTagId?: string;
  latitude: number;
  longitude: number;
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes?: string;
  createdAt: string;
}

const DB_NAME = "StreetDogDB";
const DB_VERSION = 1;
const STORE_NAME = "offlineDogs";

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

export async function saveOfflineDog(
  entry: Omit<OfflineDogEntry, "id">
): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(entry);
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

export async function syncOfflineDogs(): Promise<{
  synced: number;
  failed: number;
}> {
  const dogs = await getOfflineDogs();
  let synced = 0;
  let failed = 0;

  for (const entry of dogs) {
    try {
      const formData = new FormData();
      formData.append("dogImage", entry.dogImage, "dog_image.jpg");
      if (entry.earTagImage) {
        formData.append("earTagImage", entry.earTagImage, "ear_tag.jpg");
      }
      if (entry.earTagId) formData.append("earTagId", entry.earTagId);
      formData.append("latitude", String(entry.latitude));
      formData.append("longitude", String(entry.longitude));
      formData.append("character", entry.character);
      formData.append("size", String(entry.size));
      formData.append("gender", entry.gender);
      formData.append("age", entry.age);
      if (entry.notes) formData.append("notes", entry.notes);

      const res = await fetch("/api/sightings", {
        method: "POST",
        body: formData,
      });

      if (res.ok && entry.id != null) {
        await removeOfflineDog(entry.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
