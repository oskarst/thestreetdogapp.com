"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/section-label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DailyQuestProps {
  /** Whether the user has logged ≥1 sighting today (quest condition met). */
  complete: boolean;
  /** Whether the +15 XP has already been awarded for today. */
  claimedToday: boolean;
}

/**
 * "Daily directive" with three states:
 *   1. Not yet met → empty checkbox + "spot 1 dog today" hint
 *   2. Met but unclaimed → claimable button "+15 XP"
 *   3. Already claimed → checked + "claimed · +15 XP"
 *
 * The claim hits the claim_daily_quest() RPC; the server enforces idempotency.
 */
export function DailyQuest({ complete, claimedToday }: DailyQuestProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticClaimed, setOptimisticClaimed] = useState(false);

  const isClaimable = complete && !claimedToday && !optimisticClaimed;
  const isClaimed = claimedToday || optimisticClaimed;

  // Once the user has claimed today's directive, hide the whole block
  // until the next day's quest resets. Nothing actionable remains in the
  // claimed state, so leaving it on the dashboard just takes up space.
  if (isClaimed) return null;

  function handleClaim() {
    if (!isClaimable || pending) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("claim_daily_quest");
      if (rpcErr) {
        setError(t("questClaimError"));
        return;
      }
      const result = data as { ok?: boolean; error?: string } | null;
      if (!result?.ok) {
        setError(result?.error?.replace(/_/g, " ") ?? t("questClaimFailed"));
        return;
      }
      setOptimisticClaimed(true);
      router.refresh();
    });
  }

  return (
    <section data-tour-id="daily-quest">
      <SectionLabel meta={t("questResetsAt")}>{t("dailyDirective")}</SectionLabel>
      <div className="card-soft p-4 flex items-center gap-3.5">
        <div
          className={cn(
            "size-7 rounded-full border-[1.5px] shrink-0 relative transition-colors",
            isClaimed
              ? "bg-[var(--green-brand)] border-[var(--green-brand)]"
              : complete
                ? "bg-[var(--green-brand)] border-[var(--green-brand)] animate-pulse"
                : "bg-transparent border-ink"
          )}
        >
          {(complete || isClaimed) && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute inset-1.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-tight">
            {t("spotOneDog")}
          </div>
          <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground mt-1">
            {isClaimed
              ? t("questClaimed")
              : complete
                ? t("questReady")
                : t("questNotMet")}
          </div>
          {error && (
            <div className="font-mono text-[11px] tracking-[0.04em] text-destructive mt-1">
              {error}
            </div>
          )}
        </div>

        {isClaimable ? (
          <button
            onClick={handleClaim}
            disabled={pending}
            className={cn(
              "shrink-0 font-mono text-[12px] font-medium tracking-[0.04em]",
              "px-3 py-1.5 rounded-full bg-ink text-background",
              "transition-transform active:scale-95 disabled:opacity-60"
            )}
          >
            {pending ? "…" : t("claimXp")}
          </button>
        ) : (
          <span
            className={cn(
              "shrink-0 font-mono text-[12px] font-medium tracking-[0.04em]",
              "px-2.5 py-1.5 rounded-full",
              isClaimed
                ? "bg-muted text-muted-foreground line-through decoration-1"
                : "bg-green-soft text-green-deep"
            )}
          >
            +15 XP
          </span>
        )}
      </div>
    </section>
  );
}
