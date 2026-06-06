import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { deriveLevel } from "@/lib/dashboard";
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
  const { level, xpIntoLevel, xpPerLevel, xpToNext, progress } = deriveLevel(
    score.total_score
  );
  const nextLevel = String(level + 1).padStart(2, "0");

  return (
    <div data-tour-id="dashboard-hero">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          {t("level")}
        </div>
        {streakDays > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-soft text-amber-brand font-mono text-[11px] font-medium tracking-[0.04em] shrink-0">
            <Icon name="fire" size={13} />
            {streakDays}d
          </span>
        )}
      </div>
      <div className="flex items-end gap-4 flex-wrap">
        <div className="font-mono font-medium text-[64px] leading-[0.85] tracking-[-0.04em] text-ink">
          {String(level).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-[200px] pb-1.5">
          <div className="flex justify-between font-mono text-[10px] tracking-[0.06em] uppercase text-muted-foreground mb-1.5 gap-2">
            <span>
              <b className="text-ink font-medium">{xpIntoLevel}</b> /{" "}
              {xpPerLevel} {t("xp")}
            </span>
            <span>{t("toLevel", { xp: xpToNext, level: nextLevel })}</span>
          </div>
          <div className="relative h-1 bg-rule-2 rounded overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--green-brand)] rounded"
              style={{
                width: `${progress * 100}%`,
                animation:
                  "xp-fill 1.4s cubic-bezier(.22,.61,.36,1) 0.25s both",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
