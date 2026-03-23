"use client";

import { cn } from "@/lib/utils";
import type { DogGender } from "@/types/database";

const OPTIONS: { value: DogGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Can't Tell" },
];

interface GenderPickerProps {
  value: DogGender | "";
  onChange: (value: DogGender) => void;
}

export function GenderPicker({ value, onChange }: GenderPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
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
