"use client";

import { cn } from "@/lib/utils";
import { CharacterIcon } from "@/components/dog/character-icon";
import type { DogCharacter } from "@/types/database";

const OPTIONS: { value: DogCharacter; label: string }[] = [
  { value: "friendly", label: "friendly" },
  { value: "very_friendly", label: "v.friendly" },
  { value: "indifferent", label: "indiff." },
  { value: "sleeping", label: "sleeping" },
  { value: "afraid", label: "afraid" },
  { value: "aggressive", label: "aggressive" },
];

interface CharacterPickerProps {
  value: DogCharacter | "";
  onChange: (value: DogCharacter) => void;
}

export function CharacterPicker({ value, onChange }: CharacterPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border bg-card py-2.5 px-1.5 transition-colors",
              active
                ? "border-ink bg-ink text-background"
                : "border-rule text-ink-soft hover:border-rule-2"
            )}
          >
            <CharacterIcon
              character={opt.value}
              size={22}
              className={cn(active ? "text-background" : "text-ink-soft")}
            />
            <span
              className={cn(
                "font-mono text-[9.9px] tracking-[0.1em] uppercase",
                active ? "text-background" : "text-muted-foreground"
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
