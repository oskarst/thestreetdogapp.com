"use client";

import type { SightingWithUser } from "@/lib/db/sightings";
import { SectionLabel } from "@/components/ui/section-label";
import { sizeLabel } from "@/lib/size";
import { cn } from "@/lib/utils";

function relativeOffset(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "T-now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `T-${String(m).padStart(2, "0")}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `T-${String(h).padStart(2, "0")}h`;
  const d = Math.floor(h / 24);
  return `T-${d}d`;
}

interface SightingListProps {
  sightings: SightingWithUser[];
  /** When provided, items become buttons that focus the map marker. */
  onSelect?: (index: number) => void;
  activeIndex?: number | null;
}

export function SightingList({
  sightings,
  onSelect,
  activeIndex,
}: SightingListProps) {
  if (sightings.length === 0) {
    return (
      <div className="rounded-xl border border-rule bg-card p-4 text-center text-sm text-muted-foreground">
        No sightings yet
      </div>
    );
  }

  return (
    <div>
      <SectionLabel meta={`last ${sightings.length}`}>
        Sighting Log
      </SectionLabel>
      <div className="space-y-1.5">
        {sightings.map((s, idx) => {
          const nickname = s.nickname ?? "anon";
          const id = s.id.slice(0, 4).toUpperCase();
          const clickable = !!onSelect;
          return (
            <button
              key={s.id}
              type="button"
              onClick={clickable ? () => onSelect!(idx) : undefined}
              disabled={!clickable}
              className={cn(
                "w-full text-left grid grid-cols-[88px_1fr_auto] gap-2.5 items-center rounded-xl px-3 py-2.5 transition-colors",
                clickable && "hover:bg-muted cursor-pointer",
                activeIndex === idx
                  ? "bg-muted border border-ink/25"
                  : "bg-card"
              )}
            >
              <span className="font-mono text-[11.6px] tracking-[0.04em] text-muted-foreground">
                {relativeOffset(s.timestamp)} · #{id}
              </span>
              <div className="min-w-0">
                <div className="text-[14.3px] font-semibold leading-tight flex items-center gap-1.5">
                  <span className="truncate">
                    {nickname === "anon" ? "Sighting" : `by ${nickname}`}
                  </span>
                  {s.health_flag && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 font-mono text-[9.9px] uppercase tracking-[0.08em] text-red-500">
                      health
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11.6px] tracking-[0.04em] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  size {sizeLabel(s.size)}
                </div>
                {s.notes && (
                  <div className="text-[13.2px] text-muted-foreground mt-1 truncate">
                    {s.notes}
                  </div>
                )}
              </div>
              <span className="font-mono text-[13.2px] font-medium text-ink shrink-0">
                #{idx + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
