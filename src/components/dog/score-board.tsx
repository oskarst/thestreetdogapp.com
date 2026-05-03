import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/ui/section-label";
import type { ScoreResult } from "@/types/database";

interface ScoreBoardProps {
  score: ScoreResult;
}

/**
 * Dog Spotting Stats — three trading-card-style tiles in mono with
 * Pioneers (×10), Trackers (×5), Spottings (×1) and points contributions.
 */
export async function ScoreBoard({ score }: ScoreBoardProps) {
  const t = await getTranslations("dashboard");

  const stats = [
    {
      label: "Pioneers",
      mult: "×10",
      count: score.new_dogs,
      points: score.new_dogs_points,
    },
    {
      label: "Trackers",
      mult: "×5",
      count: score.unique_dogs,
      points: score.unique_dogs_points,
    },
    {
      label: "Spottings",
      mult: "×1",
      count: score.total_catches,
      points: score.total_catches_points,
    },
  ];

  return (
    <section>
      <SectionLabel meta={`${score.total_score} pt total`}>
        Dog Spotting Stats
      </SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="card-soft p-3 pt-3.5">
            <div className="font-mono text-[10px] text-muted-foreground tracking-[0.06em]">
              {stat.mult}
            </div>
            <div className="font-mono text-[26px] font-medium leading-none tracking-[-0.02em] mt-1.5">
              {String(stat.count).padStart(2, "0")}
            </div>
            <div className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-ink mt-2">
              {stat.label}
            </div>
            <div className="font-mono text-[10px] text-green-deep mt-0.5 tracking-[0.04em]">
              +{stat.points} {t("pts")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
