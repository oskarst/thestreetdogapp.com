"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function FindDoggoStart() {
  const router = useRouter();
  const t = useTranslations("missions");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStart() {
    if (pending) return;
    setError(null);

    if (!("geolocation" in navigator)) {
      setError(t("finddoggoLocationRequired"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startTransition(async () => {
          const supabase = createClient();
          const { data, error: rpcErr } = await supabase.rpc(
            "start_finddoggo",
            {
              p_lat: pos.coords.latitude,
              p_lng: pos.coords.longitude,
            }
          );
          if (rpcErr) {
            setError(rpcErr.message);
            return;
          }
          const r = data as
            | { ok: boolean; error?: string; dog_id?: string }
            | null;
          if (!r?.ok) {
            if (r?.error === "no_candidates") {
              setError(t("finddoggoNoCandidates"));
            } else {
              setError(r?.error ?? "unknown");
            }
            return;
          }
          router.refresh();
        });
      },
      () => setError(t("finddoggoLocationRequired")),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }

  return (
    <div className="card-soft p-6 text-center space-y-4">
      <div className="text-5xl">🐾</div>
      <h2 className="text-[20px] font-semibold leading-tight">
        {t("chooserFindTitle")}
      </h2>
      <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
        {t("chooserFindBody")}
      </p>
      <p className="font-mono text-[10px] tracking-[0.06em] uppercase text-green-deep">
        {t("finddoggoReward")}
      </p>
      <button
        type="button"
        onClick={handleStart}
        disabled={pending}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full",
          "bg-ink text-background font-semibold text-[14px]",
          "transition-transform active:scale-95 disabled:opacity-60"
        )}
      >
        {pending ? t("finddoggoStarting") : t("finddoggoStart")}
      </button>
      {error && (
        <div className="font-mono text-[11px] tracking-[0.04em] text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
