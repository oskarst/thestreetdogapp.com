"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  dogId: string;
  count: number;
}

/**
 * Lets the viewer remove only THEIR OWN sightings of this dog (soft delete via
 * delete_my_sightings_for_dog). The dog and other people's sightings stay.
 */
export function DeleteMySightingsButton({ dogId, count }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("delete_my_sightings_for_dog", {
      p_dog_id: dogId,
    });
    setBusy(false);
    const r = data as { ok?: boolean } | null;
    if (error || !r?.ok) {
      toast.error("Couldn't remove your sightings. Please try again.");
      return;
    }
    toast.success("Your sightings of this dog were removed");
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Delete my sightings
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2">
      <span className="text-[13px] text-ink">
        Remove your {count} sighting{count === 1 ? "" : "s"} of this dog?
      </span>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Delete
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}
