"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ScoreResult } from "@/types/database";

interface ScoreBoardProps {
  score: ScoreResult;
}

export function ScoreBoard({ score }: ScoreBoardProps) {
  const t = useTranslations("dashboard");

  const stats = [
    { label: t("newDogs"), count: score.new_dogs, points: score.new_dogs_points },
    {
      label: t("uniqueDogs"),
      count: score.unique_dogs,
      points: score.unique_dogs_points,
    },
    {
      label: t("totalCatches"),
      count: score.total_catches,
      points: score.total_catches_points,
    },
  ];

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <h3
        className="flex items-center gap-2 text-base font-bold mb-3"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        <Trophy className="h-5 w-5 text-amber-500" />
        {t("yourScore")}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-muted/50 p-3 text-center"
          >
            <div className="text-2xl font-bold text-primary">{stat.count}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="text-xs font-medium text-primary/80">
              +{stat.points} {t("pts")}
            </div>
          </div>
        ))}
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <div className="text-2xl font-bold text-primary">
            {score.total_score}
          </div>
          <div className="text-xs font-bold text-primary">{t("totalScore")}</div>
        </div>
      </div>
    </div>
  );
}
