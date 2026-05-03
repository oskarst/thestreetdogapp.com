import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
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

export async function Achievements({ achievements }: AchievementsProps) {
  const t = await getTranslations("dashboard");
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  return (
    <section>
      <SectionLabel meta={t("achievementsLogged", { n: unlockedCount, total })}>
        {t("achievements")}
      </SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={cn(
              "rounded-xl border bg-card p-2.5 pt-3 text-center transition-colors",
              ach.unlocked
                ? "border-rule-2"
                : "border-rule opacity-70"
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
    </section>
  );
}
