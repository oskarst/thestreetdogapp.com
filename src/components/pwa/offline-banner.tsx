"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

async function reachable(): Promise<boolean> {
  try {
    const res = await fetch("/api/ping", { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // navigator.onLine false-positives "offline" in some webviews / standalone
    // PWAs, which made this banner show for online users. Trust onLine=true,
    // but when it claims offline, confirm with a real network probe first.
    const recheck = async () => {
      if (navigator.onLine) {
        if (!cancelled) setIsOffline(false);
        return;
      }
      const ok = await reachable();
      if (!cancelled) setIsOffline(!ok);
    };

    recheck();
    window.addEventListener("offline", recheck);
    window.addEventListener("online", recheck);

    return () => {
      cancelled = true;
      window.removeEventListener("offline", recheck);
      window.removeEventListener("online", recheck);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900 border-b border-rose-200">
      <WifiOff className="size-4" />
      You&apos;re offline. Changes will sync when you reconnect.
    </div>
  );
}
