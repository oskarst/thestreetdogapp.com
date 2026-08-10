"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SectionLabel } from "@/components/ui/section-label";
import { StarBurst } from "@/components/ui/star-burst";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DailyQuestProps {
  /** Whether the user has logged ≥1 sighting today (quest condition met). */
  complete: boolean;
  /** Whether the +50 XP has already been awarded for today. */
  claimedToday: boolean;
}

/**
 * "Daily directive" with three states:
 *   1. Not yet met → empty checkbox + "spot 1 dog today" hint
 *   2. Met but unclaimed → claimable button "+50 XP"
 *   3. Already claimed → checked + "claimed · +50 XP"
 *
 * The claim hits the claim_daily_quest() RPC; the server enforces idempotency.
 */
export function DailyQuest({ complete, claimedToday }: DailyQuestProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticClaimed, setOptimisticClaimed] = useState(false);
  const [burst, setBurst] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const isClaimable = complete && !claimedToday && !optimisticClaimed;
  const isClaimed = claimedToday || optimisticClaimed;

  // Once the user has claimed today's directive, hide the whole block
  // until the next day's quest resets. Nothing actionable remains in the
  // claimed state, so leaving it on the dashboard just takes up space.
  if (isClaimed) return null;

  function handleClaim() {
    if (!isClaimable || pending || burst) return;
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
      // Celebrate on the button before the block disappears: star burst +
      // toast, then collapse the quest card and refresh the dashboard.
      setBurst(true);
      toast.success(t("questToast"));
      hideTimer.current = setTimeout(() => {
        setOptimisticClaimed(true);
        router.refresh();
      }, 900);
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
          <div className="text-[16.5px] font-semibold leading-tight">
            {t("spotOneDog")}
          </div>
          <div className="font-mono text-[12.1px] tracking-[0.04em] text-muted-foreground mt-1">
            {isClaimed
              ? t("questClaimed")
              : complete
                ? t("questReady")
                : t("questNotMet")}
          </div>
          {error && (
            <div className="font-mono text-[12.1px] tracking-[0.04em] text-destructive mt-1">
              {error}
            </div>
          )}
        </div>

        {isClaimable ? (
          <button
            onClick={handleClaim}
            disabled={pending}
            className={cn(
              "relative shrink-0 font-mono text-[13.2px] font-medium tracking-[0.04em]",
              "px-3 py-1.5 rounded-full bg-ink text-background",
              "transition-transform active:scale-95 disabled:opacity-60"
            )}
          >
            {pending ? "…" : t("claimXp")}
            {burst && <StarBurst radius={55} size={13} />}
          </button>
        ) : (
          <span
            className={cn(
              "shrink-0 font-mono text-[13.2px] font-medium tracking-[0.04em]",
              "px-2.5 py-1.5 rounded-full",
              isClaimed
                ? "bg-muted text-muted-foreground line-through decoration-1"
                : "bg-green-soft text-green-deep"
            )}
          >
            +50 XP
          </span>
        )}
      </div>
    </section>
  );
}
