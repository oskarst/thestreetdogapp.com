"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOfflineDogs,
  syncOfflineDogs,
  type OfflineDogEntry,
} from "@/lib/offline-db";

export function useOfflineDogs() {
  const [offlineDogs, setOfflineDogs] = useState<OfflineDogEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const dogs = await getOfflineDogs();
      setOfflineDogs(dogs);
    } catch {
      // IndexedDB may not be available (SSR, private mode)
    }
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineDogs();
      setLastSyncResult(result);
      await load();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [load]);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  // Listen for online/offline and SW sync-complete messages
  useEffect(() => {
    const onOnline = () => {
      // Auto-sync when coming back online
      if (offlineDogs.length > 0) {
        sync();
      }
    };

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        load();
      }
    };

    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [offlineDogs.length, sync, load]);

  return {
    offlineDogs,
    count: offlineDogs.length,
    sync,
    isSyncing,
    lastSyncResult,
  };
}
