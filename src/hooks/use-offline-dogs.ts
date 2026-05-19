"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOfflineDogs,
  removeOfflineDog,
  syncOfflineDogs,
  type OfflineDogEntry,
} from "@/lib/offline-db";

export function useOfflineDogs() {
  const [offlineDogs, setOfflineDogs] = useState<OfflineDogEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    failed: number;
    dead: number;
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

  const discard = useCallback(
    async (id: number) => {
      await removeOfflineDog(id);
      await load();
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Listen for SW sync-complete messages.
  useEffect(() => {
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        load();
      }
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [load]);

  // Pending = live entries we still want to retry. Dead = entries that
  // hit MAX_PERMANENT_FAILURES — surfaced separately so the user can
  // discard manually instead of seeing a perpetual "waiting" state.
  const { pending, deadEntries } = useMemo(() => {
    const pending: OfflineDogEntry[] = [];
    const deadEntries: OfflineDogEntry[] = [];
    for (const d of offlineDogs) {
      if (d.dead) deadEntries.push(d);
      else pending.push(d);
    }
    return { pending, deadEntries };
  }, [offlineDogs]);

  return {
    offlineDogs,
    pending,
    deadEntries,
    count: offlineDogs.length,
    pendingCount: pending.length,
    deadCount: deadEntries.length,
    sync,
    discard,
    isSyncing,
    lastSyncResult,
  };
}
