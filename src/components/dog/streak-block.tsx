import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

interface StreakBlockProps {
  days: number;
  /** Whether the user's streak counts today's sighting */
  todayLocked?: boolean;
}

const MILESTONES = [3, 7, 14, 30, 100];

function nextMilestone(days: number) {
  for (const m of MILESTONES) if (days < m) return m;
  // Past 100 — keep showing progress against next 100-day band.
  return Math.ceil((days + 1) / 100) * 100;
}

/**
 * Cool block under the Daily Directive that lights up when the user is on
 * a streak. Shows the running day count plus a row of pips toward the next
 * milestone (3 / 7 / 14 / 30 / 100 days). Single soft amber tone — same
 * palette as the streak chip in the hero.
 */
export async function StreakBlock({ days, todayLocked = true }: StreakBlockProps) {
  if (days <= 0) return null;
  const t = await getTranslations("dashboard");
  const target = nextMilestone(days);
  const pipCount = Math.min(target, 14); // never render more than 14 pips
  const filledFrom = Math.max(0, days - (target - pipCount));
  const remaining = target - days;
  const dayWord = days === 1 ? t("streakDay") : t("streakDays");
  const remainingDayWord = remaining === 1 ? t("streakDay") : t("streakDays");

  return (
    <section>
      <SectionLabel meta={t("streakNext", { n: target })}>{t("activeStreak")}</SectionLabel>
      <div className="rounded-2xl border border-amber-brand/40 bg-amber-soft p-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className="size-14 rounded-full grid place-items-center bg-amber-brand text-amber-soft"
            style={{
              boxShadow: "0 6px 14px rgba(176, 122, 44, 0.25)",
            }}
          >
            <Icon name="fire" size={28} />
          </div>
          {todayLocked && (
            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-[var(--green-brand)] border-2 border-amber-soft" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="font-mono text-[40px] font-medium tracking-[-0.04em] text-amber-brand">
              {days}
            </span>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-brand/80">
              {dayWord}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: pipCount }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full flex-1",
                  i < filledFrom
                    ? "bg-amber-brand"
                    : "bg-amber-brand/20"
                )}
              />
            ))}
          </div>
          <div className="font-mono text-[10px] tracking-[0.06em] text-amber-brand/80 mt-2">
            {remaining > 0
              ? t("daysToMilestone", { n: remaining, days: remainingDayWord, target })
              : t("milestoneHit")}
          </div>
        </div>
      </div>
    </section>
  );
}
