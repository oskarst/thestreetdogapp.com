"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { ScoreResult } from "@/types/database";
import { cn } from "@/lib/utils";

interface ScoreBoardProps {
  score: ScoreResult;
}

/**
 * Research Stats — collapsed by default into a single mono status row
 * showing P / T / S counts and the running point total. Tap to expand to
 * the three-card breakdown with multipliers and per-bucket points.
 */
export function ScoreBoard({ score }: ScoreBoardProps) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

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
    <section className="card-soft p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-1 py-1 group"
        aria-expanded={open}
      >
        <span className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-ink">
          {t("dogSpottingStats")}
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
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-rule bg-background p-3 pt-3.5"
            >
              <div className="font-mono text-[10px] text-muted-foreground tracking-[0.06em]">
                {stat.mult}
              </div>
              <div className="font-mono text-[26px] font-medium leading-none tracking-[-0.02em] mt-1.5">
                {pad(stat.count)}
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
      )}
    </section>
  );
}
