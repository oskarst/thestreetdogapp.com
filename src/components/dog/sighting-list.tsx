import type { SightingWithUser } from "@/lib/db/sightings";
import { SectionLabel } from "@/components/ui/section-label";
import { sizeLabel } from "@/lib/size";

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
}

export function SightingList({ sightings }: SightingListProps) {
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
          return (
            <div
              key={s.id}
              className="grid grid-cols-[88px_1fr_auto] gap-2.5 items-center bg-card rounded-xl px-3 py-2.5"
            >
              <span className="font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground">
                {relativeOffset(s.timestamp)} · #{id}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight">
                  {nickname === "anon" ? "Sighting" : `by ${nickname}`}
                </div>
                <div className="font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  size {sizeLabel(s.size)}
                </div>
                {s.notes && (
                  <div className="text-[12px] text-muted-foreground mt-1 truncate">
                    {s.notes}
                  </div>
                )}
              </div>
              <span className="font-mono text-[12px] font-medium text-ink shrink-0">
                #{idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
