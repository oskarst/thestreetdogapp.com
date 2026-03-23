"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineDogs } from "@/hooks/use-offline-dogs";
import type { DogCharacter } from "@/types/database";

const CHARACTER_EMOJI: Record<DogCharacter, string> = {
  friendly: "\u{1F60A}",
  very_friendly: "\u{1F970}",
  indifferent: "\u{1F610}",
  sleeping: "\u{1F634}",
  afraid: "\u{1F630}",
  aggressive: "\u{1F621}",
};

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
  const { offlineDogs, count, sync, isSyncing, lastSyncResult } =
    useOfflineDogs();
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

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

  // Build object URLs for dog thumbnails
  const thumbUrls = useMemo(() => {
    const urls: Record<number, string> = {};
    for (const dog of offlineDogs) {
      if (dog.id != null && dog.dogImage instanceof Blob) {
        urls[dog.id] = URL.createObjectURL(dog.dogImage);
      }
    }
    return urls;
  }, [offlineDogs]);

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      for (const url of Object.values(thumbUrls)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [thumbUrls]);

  // Don't render during SSR — all data comes from IndexedDB (client-only)
  if (!mounted) return null;
  if (count === 0 && !lastSyncResult) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <CloudUpload className="size-5" />
          Waiting to Sync
          {count > 0 && (
            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
              {count}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dog list */}
        {offlineDogs.length > 0 && (
          <ul className="space-y-2">
            {offlineDogs.map((dog) => (
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
                <span className="text-lg leading-none">
                  {CHARACTER_EMOJI[dog.character] ?? "\u{1F415}"}
                </span>
                <span className="ml-auto text-xs text-amber-700">
                  {timeAgo(dog.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {lastSyncResult && (
          <p className="text-sm">
            {lastSyncResult.synced > 0 && (
              <span className="text-green-700">
                Synced {lastSyncResult.synced} dog
                {lastSyncResult.synced !== 1 ? "s" : ""}
              </span>
            )}
            {lastSyncResult.synced > 0 && lastSyncResult.failed > 0 && " — "}
            {lastSyncResult.failed > 0 && (
              <span className="text-red-700">
                {lastSyncResult.failed} failed
              </span>
            )}
          </p>
        )}

        <Button
          onClick={handleSync}
          disabled={isSyncing || count === 0 || !isOnline}
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
