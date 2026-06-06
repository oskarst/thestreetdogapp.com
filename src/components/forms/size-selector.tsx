"use client";

import { SIZE_OPTIONS } from "@/lib/size";
import { cn } from "@/lib/utils";

interface SizeSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Five-bucket size picker (XS/S/M/L/XL) replacing the old 1-10 slider.
 * Each button writes a representative integer into the size column.
 */
export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {SIZE_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-3 transition-colors",
              selected
                ? "border-ink bg-ink text-background"
                : "border-rule-2 bg-card text-ink hover:bg-muted"
            )}
          >
            <span className="font-mono text-[15px] font-semibold tracking-[0.04em]">
              {opt.label}
            </span>
            {opt.hint && (
              <span
                className={cn(
                  "text-[9px] leading-tight tracking-[0.02em]",
                  selected ? "text-background/70" : "text-muted-foreground"
                )}
              >
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
