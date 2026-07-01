"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CorrectTagPanelProps {
  /** The sighting just created by this add — the row we re-home. */
  sightingId: string;
  /** The dog this sighting currently sits on (the possibly-wrong match). */
  currentDogId: string;
}

const ERRORS: Record<string, string> = {
  not_found: "We couldn't find your sighting to move.",
  unauthorized: "Please sign in again.",
};

/**
 * Escape hatch for a mistyped ear tag. Adding a dog matches an existing tag
 * in the same city and attaches the entry as a sighting of THAT dog. If the
 * tag was a typo, the user landed on the wrong dog — this lets them re-home
 * their own sighting onto the correct tag (which either finds the right
 * existing dog or spins out a new one). Backed by correct_my_sighting_tag.
 */
export function CorrectTagPanel({
  sightingId,
  currentDogId,
}: CorrectTagPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc(
        "correct_my_sighting_tag",
        { p_sighting_id: sightingId, p_ear_tag_id: tag.trim() }
      );
      const r = data as {
        ok?: boolean;
        error?: string;
        dog_id?: string;
        created_new?: boolean;
        unchanged?: boolean;
      } | null;
      if (rpcErr || !r?.ok) {
        setError(ERRORS[r?.error ?? ""] ?? "Couldn't move the sighting.");
        return;
      }
      if (r.unchanged || !r.dog_id || r.dog_id === currentDogId) {
        toast.success("Already on the right dog.");
        setOpen(false);
        return;
      }
      toast.success(
        r.created_new
          ? "Moved to a new dog with that tag."
          : "Moved to the dog with that tag."
      );
      router.push(`/dog/${r.dog_id}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full text-center font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors py-2"
      >
        Not this dog? Fix the tag
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 rounded-xl border border-rule-2 bg-card p-3.5 space-y-2.5"
    >
      <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
        Correct ear tag
      </div>
      <p className="text-[13px] leading-snug text-muted-foreground">
        If the tag was mistyped, enter the right one. Your photo and sighting
        move to the correct dog. Leave blank to log it as an untagged dog.
      </p>
      <input
        value={tag}
        onChange={(e) => {
          setTag(e.target.value);
          setError(null);
        }}
        placeholder="e.g. 27610 (or leave blank)"
        className="w-full rounded-xl border border-rule bg-background px-3 py-2.5 text-[15.4px] text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink"
      />
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={saving}
          className="font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors px-2 py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[12.1px] font-medium tracking-[0.06em] uppercase bg-ink text-background disabled:opacity-50 hover:brightness-110 transition-all"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Move sighting
        </button>
      </div>
    </form>
  );
}
