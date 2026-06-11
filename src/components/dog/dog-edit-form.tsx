"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CharacterPicker } from "@/components/forms/character-picker";
import { SizeSelector } from "@/components/forms/size-selector";
import { GenderPicker } from "@/components/forms/gender-picker";
import { AgePicker } from "@/components/forms/age-picker";
import { DEFAULT_SIZE } from "@/lib/size";
import type { DogCharacter, DogGender, DogAge } from "@/types/database";

interface DogEditFormProps {
  dogId: string;
  initial: {
    character: DogCharacter | null;
    size: number | null;
    gender: DogGender | null;
    age: DogAge | null;
  };
}

/**
 * Lets a catcher (spotter or registrar) correct a dog's shared details —
 * character, size, gender, age. Writes through the user-context client; RLS
 * lets any non-banned user update a dog (migration 001). Names have their own
 * flow on /dog/[id]/name.
 */
export function DogEditForm({ dogId, initial }: DogEditFormProps) {
  const router = useRouter();
  const [character, setCharacter] = useState<DogCharacter | "">(
    initial.character ?? ""
  );
  const [size, setSize] = useState<number>(initial.size ?? DEFAULT_SIZE);
  const [gender, setGender] = useState<DogGender | "">(initial.gender ?? "");
  const [age, setAge] = useState<DogAge | "">(initial.age ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gender) return setError("Pick a gender (or 'unsure').");
    if (!age) return setError("Pick an age.");

    startTransition(async () => {
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from("dogs")
        .update({
          character: character || null,
          size,
          gender,
          age,
        })
        .eq("id", dogId);
      if (updErr) {
        setError("Couldn't save changes. Please try again.");
        return;
      }
      toast.success("Dog details updated.");
      router.push(`/dog/${dogId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Character">
        <CharacterPicker value={character} onChange={setCharacter} />
      </Field>

      <Field label="Size">
        <SizeSelector value={size} onChange={setSize} />
      </Field>

      <Field label="Gender">
        <GenderPicker value={gender} onChange={setGender} />
      </Field>

      <Field label="Age">
        <AgePicker value={age} onChange={setAge} />
      </Field>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/dog/${dogId}`}
          className="font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors no-underline px-2 py-1.5"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[12.1px] font-medium tracking-[0.06em] uppercase bg-ink text-background disabled:opacity-50 hover:brightness-110 transition-all"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}
