"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import type { Achievement } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

interface AchievementsProps {
  achievements: Achievement[];
}

const ACHIEVEMENT_LABEL_KEY: Record<string, string> = {
  first_spot: "achFirstSpot",
  ten_spottings: "achTenSpottings",
  five_trackers: "achFiveTrackers",
  five_pioneers: "achFivePioneers",
  fifty_spottings: "achFiftySpottings",
  seven_day_streak: "achSevenDayStreak",
};

export function Achievements({ achievements }: AchievementsProps) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  return (
    <section className="card-soft p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-3 px-1 py-1 group"
        aria-expanded={open}
      >
        <span className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-ink group-hover:text-ink transition-colors">
          {t("achievements")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground group-hover:text-ink transition-colors">
          {t("achievementsLogged", { n: unlockedCount, total })}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-3 gap-2 mt-3">
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
      )}
    </section>
  );
}
