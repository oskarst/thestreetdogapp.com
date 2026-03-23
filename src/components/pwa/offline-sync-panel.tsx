"use client";

import { CloudUpload, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineDogs } from "@/hooks/use-offline-dogs";

export function OfflineSyncPanel() {
  const { count, sync, isSyncing, lastSyncResult } = useOfflineDogs();

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
        {count > 0 && (
          <p className="text-sm text-amber-800">
            {count} dog{count !== 1 ? "s" : ""} saved offline, pending upload.
          </p>
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
          onClick={sync}
          disabled={isSyncing || count === 0}
          variant="outline"
          size="sm"
          className="w-full border-amber-400"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Syncing...
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
