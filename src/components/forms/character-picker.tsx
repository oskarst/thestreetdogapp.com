"use client";

import { cn } from "@/lib/utils";
import { CharacterIcon } from "@/components/dog/character-icon";
import type { DogCharacter } from "@/types/database";

const OPTIONS: { value: DogCharacter; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "very_friendly", label: "Very Friendly" },
  { value: "indifferent", label: "Indifferent" },
  { value: "sleeping", label: "Sleeping" },
  { value: "afraid", label: "Afraid" },
  { value: "aggressive", label: "Aggressive" },
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
          <CharacterIcon character={opt.value} className="size-5" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
