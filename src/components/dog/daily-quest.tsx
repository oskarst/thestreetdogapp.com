"use client";

import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

interface DailyQuestProps {
  /** Whether the user has already logged ≥1 sighting today */
  complete: boolean;
}

/**
 * "Daily directive" — shows whether today's quest (spot 1 dog) is met.
 * The check is derived from sightings on the server; this component is
 * read-only display.
 */
export function DailyQuest({ complete }: DailyQuestProps) {
  return (
    <section>
      <SectionLabel meta="resets 00:00">Daily Directive</SectionLabel>
      <div className="card-soft p-4 flex items-center gap-3.5">
        <div
          className={cn(
            "size-7 rounded-full border-[1.5px] shrink-0 relative transition-colors",
            complete
              ? "bg-[var(--green-brand)] border-[var(--green-brand)]"
              : "bg-transparent border-ink"
          )}
        >
          {complete && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute inset-1.5"
              style={{
                animation: "check-pop 0.32s cubic-bezier(.34,1.56,.64,1)",
              }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-tight">
            Spot 1 dog today
          </div>
          <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground mt-1">
            {complete ? "1 / 1 logged · complete" : "0 / 1 logged"}
          </div>
        </div>
        <span className="font-mono text-[12px] font-medium tracking-[0.04em] px-2.5 py-1.5 rounded-full bg-green-soft text-green-deep shrink-0">
          +5 XP
        </span>
      </div>
    </section>
  );
}
