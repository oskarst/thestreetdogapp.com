"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionLabel } from "@/components/ui/section-label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DailyQuestProps {
  /** Whether the user has logged ≥1 sighting today (quest condition met). */
  complete: boolean;
  /** Whether the +5 XP has already been awarded for today. */
  claimedToday: boolean;
}

/**
 * "Daily directive" with three states:
 *   1. Not yet met → empty checkbox + "spot 1 dog today" hint
 *   2. Met but unclaimed → claimable button "+5 XP"
 *   3. Already claimed → checked + "claimed · +5 XP"
 *
 * The claim hits the claim_daily_quest() RPC; the server enforces idempotency.
 */
export function DailyQuest({ complete, claimedToday }: DailyQuestProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticClaimed, setOptimisticClaimed] = useState(false);

  const isClaimable = complete && !claimedToday && !optimisticClaimed;
  const isClaimed = claimedToday || optimisticClaimed;

  function handleClaim() {
    if (!isClaimable || pending) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("claim_daily_quest");
      if (rpcErr) {
        setError("Couldn't claim — try again in a moment.");
        return;
      }
      const result = data as { ok?: boolean; error?: string } | null;
      if (!result?.ok) {
        setError(result?.error?.replace(/_/g, " ") ?? "Claim failed.");
        return;
      }
      setOptimisticClaimed(true);
      router.refresh();
    });
  }

  return (
    <section>
      <SectionLabel meta="resets 00:00">Daily Directive</SectionLabel>
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
            Spot 1 dog today
          </div>
          <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground mt-1">
            {isClaimed
              ? "1 / 1 logged · claimed · +5 XP"
              : complete
                ? "1 / 1 logged · ready to claim"
                : "0 / 1 logged"}
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
            {pending ? "…" : "Claim +5 XP"}
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
            +5 XP
          </span>
        )}
      </div>
    </section>
  );
}
