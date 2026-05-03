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

/**
 * Hybrid dashboard hero: operator card + Dog Spotting Level + XP bar.
 * Mirrors the layout in dashboard-preview-hybrid.html.
 */
export async function DashboardHero({
  score,
  nickname,
  shortId,
  streakDays,
}: DashboardHeroProps) {
  const t = await getTranslations("dashboard");
  const { level, xpIntoLevel, xpPerLevel, xpToNext, progress } = deriveLevel(
    score.total_score
  );
  const initial = nickname.charAt(0).toUpperCase();
  const nextLevel = String(level + 1).padStart(2, "0");

  return (
    <section className="card-soft p-4">
      {/* Operator row */}
      <div className="flex items-center gap-3 pb-4 border-b border-dashed border-rule">
        <div className="grid size-10 place-items-center rounded-full bg-ink text-background font-mono text-base font-medium shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-tight truncate">
            {nickname}
          </div>
          <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] tracking-[0.06em] text-muted-foreground flex-wrap">
            <span className="text-green-deep inline-flex items-center gap-1">
              <span
                className="size-1.5 rounded-full bg-[var(--green-brand)]"
                style={{
                  animation: "pulse-dot 1.8s ease-in-out infinite",
                }}
              />
              {t("statusOnDuty")}
            </span>
            <span className="text-muted-foreground/60">{shortId}</span>
          </div>
        </div>
        {streakDays > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-soft text-amber-brand font-mono text-[11px] font-medium tracking-[0.04em] shrink-0">
            <Icon name="fire" size={13} />
            {streakDays}d
          </span>
        )}
      </div>

      {/* Level + XP */}
      <div className="pt-4">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          {t("level")}
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="font-mono font-medium text-[96px] leading-[0.85] tracking-[-0.04em] text-ink">
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
    </section>
  );
}
