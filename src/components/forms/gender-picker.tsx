"use client";

import { cn } from "@/lib/utils";
import type { DogGender } from "@/types/database";

const OPTIONS: { value: DogGender; label: string }[] = [
  { value: "male", label: "male" },
  { value: "female", label: "female" },
  { value: "unknown", label: "unsure" },
];

interface GenderPickerProps {
  value: DogGender | "";
  onChange: (value: DogGender) => void;
}

export function GenderPicker({ value, onChange }: GenderPickerProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-full border px-3 py-2.5 text-center transition-colors",
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
