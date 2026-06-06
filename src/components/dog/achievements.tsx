"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import type { Achievement } from "@/lib/dashboard";
import type { ScoreResult } from "@/types/database";
import { cn } from "@/lib/utils";

interface AchievementsProps {
  achievements: Achievement[];
  score: ScoreResult;
}

const ACHIEVEMENT_LABEL_KEY: Record<string, string> = {
  first_spot: "achFirstSpot",
  ten_spottings: "achTenSpottings",
  five_trackers: "achFiveTrackers",
  five_pioneers: "achFivePioneers",
  fifty_spottings: "achFiftySpottings",
  seven_day_streak: "achSevenDayStreak",
};

export function Achievements({ achievements, score }: AchievementsProps) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  const stats = [
    {
      label: t("pioneers"),
      mult: "×30",
      count: score.new_dogs,
      points: score.new_dogs_points,
    },
    {
      label: t("trackers"),
      mult: "×20",
      count: score.unique_dogs,
      points: score.unique_dogs_points,
    },
    {
      label: t("spottings"),
      mult: "×10",
      count: score.total_catches,
      points: score.total_catches_points,
    },
  ];

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-3 px-1 py-1 group"
        aria-expanded={open}
      >
        <span className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-ink group-hover:text-ink transition-colors">
          {t("achievements")}
        </span>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground group-hover:text-ink transition-colors">
          <span className="text-ink">
            {pad(score.new_dogs)}
            <span className="text-muted-foreground/50 px-1">·</span>
            {pad(score.unique_dogs)}
            <span className="text-muted-foreground/50 px-1">·</span>
            {pad(score.total_catches)}
          </span>
          <span className="text-green-deep">
            {t("ptTotal", { n: score.total_score })}
          </span>
          <span>{t("achievementsLogged", { n: unlockedCount, total })}</span>
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-rule bg-background p-2.5 pt-3"
              >
                <div className="font-mono text-[9px] text-muted-foreground tracking-[0.06em]">
                  {stat.mult}
                </div>
                <div className="font-mono text-[22px] font-medium leading-none tracking-[-0.02em] mt-1">
                  {pad(stat.count)}
                </div>
                <div className="font-mono text-[9px] font-medium tracking-[0.16em] uppercase text-ink mt-1.5">
                  {stat.label}
                </div>
                <div className="font-mono text-[9px] text-green-deep mt-0.5 tracking-[0.04em]">
                  +{stat.points} {t("pts")}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={cn(
                "rounded-xl border bg-background p-2.5 pt-3 text-center transition-colors",
                ach.unlocked ? "border-rule-2" : "border-rule opacity-70"
              )}
            >
              <div
                className={cn(
                  "size-9 rounded-full mx-auto mb-1.5 grid place-items-center",
                  ach.unlocked
                    ? "bg-ink text-background"
                    : "bg-rule text-muted-foreground"
                )}
              >
                <Icon name={ach.iconName} size={18} />
              </div>
              <div
                className={cn(
                  "text-[10px] font-semibold leading-tight",
                  !ach.unlocked && "text-muted-foreground"
                )}
              >
                {ACHIEVEMENT_LABEL_KEY[ach.id]
                  ? t(ACHIEVEMENT_LABEL_KEY[ach.id])
                  : ach.name}
              </div>
              <div className="font-mono text-[9px] tracking-[0.16em] uppercase text-muted-foreground mt-1">
                {ach.unlocked
                  ? t("achievementUnlocked")
                  : t("achievementToGo", { n: ach.threshold - ach.progress })}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
