"use client";

import { cn } from "@/lib/utils";
import type { DogCharacter } from "@/types/database";

const OPTIONS: { value: DogCharacter; emoji: string; label: string }[] = [
  { value: "friendly", emoji: "\u{1F60A}", label: "Friendly" },
  { value: "very_friendly", emoji: "\u{1F970}", label: "Very Friendly" },
  { value: "indifferent", emoji: "\u{1F610}", label: "Indifferent" },
  { value: "sleeping", emoji: "\u{1F634}", label: "Sleeping" },
  { value: "afraid", emoji: "\u{1F630}", label: "Afraid" },
  { value: "aggressive", emoji: "\u{1F621}", label: "Aggressive" },
];

interface CharacterPickerProps {
  value: DogCharacter | "";
  onChange: (value: DogCharacter) => void;
}

export function CharacterPicker({ value, onChange }: CharacterPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          <span className="text-lg">{opt.emoji}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
