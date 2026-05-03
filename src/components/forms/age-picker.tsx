"use client";

import { cn } from "@/lib/utils";
import type { DogAge } from "@/types/database";

const OPTIONS: { value: DogAge; label: string }[] = [
  { value: "puppy", label: "puppy" },
  { value: "young", label: "young" },
  { value: "adult", label: "adult" },
  { value: "old", label: "old" },
];

interface AgePickerProps {
  value: DogAge | "";
  onChange: (value: DogAge) => void;
}

export function AgePicker({ value, onChange }: AgePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-2 py-2.5 text-center transition-colors",
              "font-mono text-[11px] font-medium tracking-[0.1em] uppercase",
              active
                ? "border-ink bg-ink text-background"
                : "border-rule bg-card text-muted-foreground hover:border-rule-2"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
