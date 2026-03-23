"use client";

import { cn } from "@/lib/utils";
import type { DogAge } from "@/types/database";

const OPTIONS: { value: DogAge; label: string }[] = [
  { value: "puppy", label: "Puppy" },
  { value: "young", label: "Young" },
  { value: "adult", label: "Adult" },
  { value: "old", label: "Old" },
];

interface AgePickerProps {
  value: DogAge | "";
  onChange: (value: DogAge) => void;
}

export function AgePicker({ value, onChange }: AgePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value === opt.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
