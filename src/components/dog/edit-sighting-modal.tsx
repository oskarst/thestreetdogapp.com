"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SizeSelector } from "@/components/forms/size-selector";
import { GenderPicker } from "@/components/forms/gender-picker";
import { AgePicker } from "@/components/forms/age-picker";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { SightingWithUser } from "@/lib/db/sightings";
import type { DogGender, DogAge } from "@/types/database";

interface EditSightingModalProps {
  sighting: SightingWithUser;
  onClose: () => void;
}

/**
 * Edit-your-own-sighting dialog. Mirrors the Add-Dog descriptive fields
 * (size / gender / age / aggressive / notes) and persists via the
 * update_my_sighting RPC, then refreshes the server-rendered dog page.
 * Mount with key={sighting.id} so each open starts from that row's values.
 */
export function EditSightingModal({ sighting, onClose }: EditSightingModalProps) {
  const router = useRouter();
  const [size, setSize] = useState<number>(sighting.size);
  const [gender, setGender] = useState<DogGender | "">(sighting.gender);
  const [age, setAge] = useState<DogAge | "">(sighting.age);
  const [aggressive, setAggressive] = useState(sighting.character === "aggressive");
  const [notes, setNotes] = useState(sighting.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!gender || !age) {
      toast.error("Please pick a gender and age.");
      return;
    }
    setSaving(true);
    // Preserve a non-aggressive nuance (e.g. "sleeping") when the user didn't
    // touch the aggressive toggle; otherwise map to friendly/aggressive.
    const character = aggressive
      ? "aggressive"
      : sighting.character === "aggressive"
        ? "friendly"
        : sighting.character;

    const supabase = createClient();
    const { data, error } = await supabase.rpc("update_my_sighting", {
      p_id: sighting.id,
      p_character: character,
      p_size: size,
      p_gender: gender,
      p_age: age,
      p_notes: notes.trim() || null,
    });
    setSaving(false);

    const r = data as { ok?: boolean } | null;
    if (error || !r?.ok) {
      toast.error("Couldn't save changes. Please try again.");
      return;
    }
    toast.success("Sighting updated");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit your sighting</DialogTitle>
          <DialogDescription>
            Update what you logged. Location, time and photos stay as recorded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Size</label>
            <SizeSelector value={size} onChange={setSize} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Gender</label>
              <GenderPicker value={gender} onChange={setGender} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Age</label>
              <AgePicker value={age} onChange={setAge} />
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-rule-2 bg-card px-3.5 py-3 cursor-pointer select-none has-[:checked]:border-amber-brand has-[:checked]:bg-amber-soft transition-colors">
            <input
              type="checkbox"
              checked={aggressive}
              onChange={(e) => setAggressive(e.target.checked)}
              className="size-4 shrink-0 accent-[var(--amber-brand)]"
            />
            <span className="text-sm font-medium text-ink">Aggressive dog</span>
          </label>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Anything worth noting…"
              className="w-full rounded-xl border border-rule bg-card px-3.5 py-2.5 text-sm leading-snug text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
