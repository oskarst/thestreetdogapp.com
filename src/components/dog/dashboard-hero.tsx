import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { XpBar } from "@/components/dog/xp-bar";
import { deriveLevel, deriveTitle } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { ScoreResult } from "@/types/database";

interface DashboardHeroProps {
  score: ScoreResult;
  nickname: string;
  shortId: string;
  streakDays: number;
}

export async function DashboardHero({
  score,
  streakDays,
}: DashboardHeroProps) {
  const t = await getTranslations("dashboard");
  const { level } = deriveLevel(score.total_score);
  const { title } = deriveTitle(level);
  // Streak heat: the flame gets livelier the longer the streak holds.
  const streakTier =
    streakDays >= 30 ? 3 : streakDays >= 7 ? 2 : streakDays >= 3 ? 1 : 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            {t("level")}
          </span>
          <Link
            href="/levels"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-soft text-green-deep font-mono text-[11px] font-medium tracking-[0.06em] uppercase shrink-0 truncate no-underline hover:brightness-95 transition"
          >
            <Icon name="medal" size={12} />
            {title}
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[12.1px] font-medium tracking-[0.04em] text-green-deep whitespace-nowrap">
            {t("ptTotal", { n: score.total_score })}
          </span>
          {streakDays > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-soft text-amber-brand font-mono text-[12.1px] font-medium tracking-[0.04em] shrink-0">
              <span
                className={cn(
                  "inline-flex",
                  streakTier === 1 && "streak-flame streak-flame-1",
                  streakTier === 2 && "streak-flame streak-flame-2",
                  streakTier === 3 && "streak-flame streak-flame-3"
                )}
              >
                <Icon name="fire" size={13 + streakTier * 2} />
              </span>
              {streakDays}d
            </span>
          )}
        </div>
      </div>
      <div className="flex items-end gap-4 flex-wrap">
        <div className="font-mono font-medium text-[70.4px] leading-[0.85] tracking-[-0.04em] text-ink">
          {String(level).padStart(2, "0")}
        </div>
        <XpBar totalScore={score.total_score} />
      </div>
    </div>
  );
}
