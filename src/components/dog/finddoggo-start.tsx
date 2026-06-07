"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function FindDoggoStart() {
  const t = useTranslations("missions");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runStart(lat: number, lng: number) {
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("start_finddoggo", {
      p_lat: lat,
      p_lng: lng,
    });
    if (rpcErr) {
      setPending(false);
      setError(rpcErr.message);
      return;
    }
    const r = data as
      | { ok: boolean; error?: string; dog_id?: string }
      | null;
    if (!r?.ok) {
      setPending(false);
      if (r?.error === "no_candidates") {
        setError(t("finddoggoNoCandidates"));
      } else {
        setError(r?.error ?? "unknown");
      }
      return;
    }
    // Hard reload. router.refresh() relies on the server fetching the
    // updated profile row through get_my_profile(); when its return type
    // was stale (pre-018 migration), the new active_finddoggo_dog_id
    // wasn't in the response and the page kept rendering this start
    // screen. A full navigation is also more resilient to any RSC cache
    // edge cases and gives the user a familiar "thing changed" cue.
    window.location.href = "/missions/find-doggo";
  }

  function handleStart() {
    if (pending) return;
    setError(null);
    setPending(true);

    if (!("geolocation" in navigator)) {
      setPending(false);
      setError(t("finddoggoLocationRequired"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        runStart(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setPending(false);
        setError(t("finddoggoLocationRequired"));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }

  return (
    <div className="card-soft p-5">
      <div className="flex items-start gap-4">
        {/* Static dog graphic on the left of the content. */}
        <div className="size-24 shrink-0 grid place-items-center rounded-2xl bg-amber-brand text-amber-soft">
          <Icon name="dog" size={52} />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-[15.4px] text-muted-foreground leading-relaxed">
            {t("chooserFindBody")}
          </p>
          <p className="font-mono text-[11px] tracking-[0.06em] uppercase text-green-deep">
            {t("finddoggoReward")}
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={pending}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full",
              "bg-ink text-background font-semibold text-[15.4px]",
              "transition-transform active:scale-95 disabled:opacity-60"
            )}
          >
            {pending && (
              <span
                className="size-3 rounded-full border-2 border-background/40 border-t-background animate-spin"
                aria-hidden
              />
            )}
            {pending ? t("finddoggoStarting") : t("finddoggoStart")}
          </button>
          {error && (
            <div className="font-mono text-[12.1px] tracking-[0.04em] text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
