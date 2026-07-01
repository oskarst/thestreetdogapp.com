"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface DogEditFormProps {
  dogId: string;
  initialEarTag: string | null;
}

const TAG_ERRORS: Record<string, string> = {
  not_owner: "You can only edit dogs you registered.",
  dog_not_found: "This dog no longer exists.",
};

/**
 * Owner-only dog edit: change the ear tag id, or soft-delete the dog. Both go
 * through owner-checked RPCs (update_my_dog_ear_tag / soft_delete_dog).
 */
export function DogEditForm({ dogId, initialEarTag }: DogEditFormProps) {
  const router = useRouter();
  const [earTag, setEarTag] = useState(initialEarTag ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savingTag, startSaveTag] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function saveTag(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSaveTag(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc(
        "update_my_dog_ear_tag",
        { p_dog_id: dogId, p_ear_tag_id: earTag.trim() }
      );
      const r = data as {
        ok?: boolean;
        error?: string;
        merged?: boolean;
        canonical_dog_id?: string;
      } | null;
      if (rpcErr || !r?.ok) {
        setError(TAG_ERRORS[r?.error ?? ""] ?? "Couldn't save the tag id.");
        return;
      }
      // A dog with this tag already existed in this city: this entry was a
      // duplicate of the same dog, so its sighting was folded into the
      // existing record. Land the user on that canonical dog.
      if (r.merged && r.canonical_dog_id) {
        toast.success("This dog was already registered here — added your sighting to it.");
        router.push(`/dog/${r.canonical_dog_id}`);
        router.refresh();
        return;
      }
      toast.success("Tag id updated.");
      router.push(`/dog/${dogId}`);
      router.refresh();
    });
  }

  function softDelete() {
    setError(null);
    startDelete(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("soft_delete_dog", {
        p_dog_id: dogId,
      });
      const r = data as { ok?: boolean; error?: string } | null;
      if (rpcErr || !r?.ok) {
        setError(TAG_ERRORS[r?.error ?? ""] ?? "Couldn't delete this dog.");
        return;
      }
      toast.success("Dog removed.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={saveTag} className="card-soft p-4 space-y-3">
        <div>
          <label
            htmlFor="ear-tag"
            className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground"
          >
            Ear tag id
          </label>
          <input
            id="ear-tag"
            value={earTag}
            onChange={(e) => {
              setEarTag(e.target.value);
              setError(null);
            }}
            placeholder="e.g. 27610 (leave blank if untagged)"
            className="mt-1.5 w-full rounded-xl border border-rule bg-background px-3 py-2.5 text-[15.4px] text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink"
          />
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Only the dog&apos;s registrar can change this.
          </p>
        </div>

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
            disabled={savingTag}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[12.1px] font-medium tracking-[0.06em] uppercase bg-ink text-background disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {savingTag && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save tag id
          </button>
        </div>
      </form>

      <div className="card-soft p-4 border-destructive/30">
        <h2 className="text-[15px] font-semibold">Remove this dog</h2>
        <p className="text-[13.5px] text-muted-foreground mt-1 leading-snug">
          Soft-deletes the dog you registered — it disappears from the app and
          from scores, and is recoverable by an admin.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/50 px-4 py-2 text-destructive text-sm font-semibold hover:bg-destructive/10 transition"
          >
            <Trash2 className="size-4" /> Delete dog
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={softDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Yes, delete"
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-ink transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
