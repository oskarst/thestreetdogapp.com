"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CloudUpload,
  Loader2,
  RefreshCw,
  Trash2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineDogs } from "@/hooks/use-offline-dogs";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OfflineSyncPanel() {
  const router = useRouter();
  const {
    pending,
    deadEntries,
    pendingCount,
    deadCount,
    sync,
    discard,
    isSyncing,
    lastSyncResult,
  } = useOfflineDogs();
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const handleSync = useCallback(async () => {
    const result = await sync();
    if (result && result.synced > 0) {
      router.refresh();
    }
  }, [sync, router]);

  // Auto-retry on reconnect: when the browser flips back online and we
  // still have non-dead entries, kick off a sync. The ref guard prevents
  // re-firing during a single online session if it fails.
  useEffect(() => {
    if (!mounted || !isOnline || pendingCount === 0 || isSyncing) return;
    if (autoTriedRef.current) return;
    autoTriedRef.current = true;
    handleSync();
  }, [mounted, isOnline, pendingCount, isSyncing, handleSync]);
  useEffect(() => {
    if (!isOnline) autoTriedRef.current = false;
  }, [isOnline]);

  // Build object URLs for dog thumbnails (combined pending + dead).
  const allOfflineDogs = useMemo(
    () => [...pending, ...deadEntries],
    [pending, deadEntries]
  );
  const thumbUrls = useMemo(() => {
    const urls: Record<number, string> = {};
    for (const dog of allOfflineDogs) {
      if (dog.id != null && dog.dogImage instanceof Blob) {
        urls[dog.id] = URL.createObjectURL(dog.dogImage);
      }
    }
    return urls;
  }, [allOfflineDogs]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(thumbUrls)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [thumbUrls]);

  if (!mounted) return null;
  if (pendingCount === 0 && deadCount === 0 && !lastSyncResult) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <CloudUpload className="size-5" />
          Waiting to Sync
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length > 0 && (
          <ul className="space-y-2">
            {pending.map((dog) => (
              <li
                key={dog.id}
                className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2"
              >
                {dog.id != null && thumbUrls[dog.id] ? (
                  <img
                    src={thumbUrls[dog.id]}
                    alt=""
                    className="size-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="size-10 rounded-md bg-amber-200" />
                )}
                <span className="text-lg leading-none">{"\u{1F415}"}</span>
                <span className="ml-auto text-xs text-amber-700">
                  {timeAgo(dog.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {deadEntries.length > 0 && (
          <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-800">
              <AlertTriangle className="size-4" />
              Couldn&apos;t sync {deadCount} sighting
              {deadCount !== 1 ? "s" : ""}
            </div>
            <ul className="space-y-1.5">
              {deadEntries.map((dog) => (
                <li
                  key={dog.id}
                  className="flex items-center gap-3 rounded-md bg-white/70 px-2 py-1.5"
                >
                  {dog.id != null && thumbUrls[dog.id] ? (
                    <img
                      src={thumbUrls[dog.id]}
                      alt=""
                      className="size-8 rounded object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded bg-red-200" />
                  )}
                  <div className="flex-1 text-xs text-red-900">
                    <div className="font-medium">
                      {dog.lastFailureStatus
                        ? `Rejected by server (${dog.lastFailureStatus})`
                        : "Rejected"}
                    </div>
                    {dog.lastFailureMessage && (
                      <div className="text-red-700/70 truncate">
                        {dog.lastFailureMessage}
                      </div>
                    )}
                  </div>
                  {dog.id != null && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => discard(dog.id!)}
                      aria-label="Discard this sighting"
                      className="size-7 p-0 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lastSyncResult && (
          <p className="text-sm">
            {lastSyncResult.synced > 0 && (
              <span className="text-green-700">
                Synced {lastSyncResult.synced} sighting
                {lastSyncResult.synced !== 1 ? "s" : ""}
              </span>
            )}
            {lastSyncResult.synced > 0 && lastSyncResult.failed > 0 && " — "}
            {lastSyncResult.failed > 0 && (
              <span className="text-amber-700">
                {lastSyncResult.failed} will retry
              </span>
            )}
          </p>
        )}

        <Button
          onClick={handleSync}
          disabled={isSyncing || pendingCount === 0 || !isOnline}
          variant="outline"
          size="sm"
          className="w-full border-amber-400"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Syncing...
            </>
          ) : !isOnline ? (
            <>
              <WifiOff className="mr-2 size-4" />
              Waiting for connection...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              Sync Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
