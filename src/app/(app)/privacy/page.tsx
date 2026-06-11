"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function PrivacyPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleExport() {
    setExporting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("export_my_data");
    setExporting(false);

    if (error || !data?.ok) {
      toast.error("Couldn't export your data. Please try again.");
      return;
    }

    // Hand the user a downloadable copy of everything tied to their account.
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "street-dog-my-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Your data is downloading.");
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("soft_delete_my_dog_data");
    setDeleting(false);
    setConfirmDelete(false);

    if (error || !data?.ok) {
      toast.error("Couldn't delete your data. Please try again.");
      return;
    }

    toast.success(
      `Deleted ${data.dogs_deleted} dog${data.dogs_deleted === 1 ? "" : "s"} and ${data.sightings_deleted} sighting${data.sightings_deleted === 1 ? "" : "s"}.`
    );
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 font-mono text-[12.1px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
        Account · Privacy &amp; data
      </div>
      <h1 className="text-[28.6px] font-bold tracking-[-0.02em] leading-tight mb-1.5">
        Your data
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Take a copy of your data or remove it. These controls only affect data
        tied to your account.
      </p>

      {/* Transfer / export */}
      <section className="card-soft px-4 py-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-10 rounded-xl bg-muted shrink-0">
            <Download className="size-5 text-ink" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold leading-tight">
              Transfer my dog data
            </h2>
            <p className="text-[13.5px] text-muted-foreground mt-1 leading-snug">
              Download everything you&apos;ve added — your profile, the dogs you
              registered, and your sightings — as a JSON file you can keep or
              move elsewhere.
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-background text-sm font-semibold hover:brightness-110 transition disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Preparing…
                </>
              ) : (
                <>
                  <Download className="size-4" /> Download my data
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Delete */}
      <section className="card-soft px-4 py-4 border-destructive/30">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-10 rounded-xl bg-destructive/10 shrink-0">
            <Trash2 className="size-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold leading-tight">
              Delete my data
            </h2>
            <p className="text-[13.5px] text-muted-foreground mt-1 leading-snug">
              Removes your sightings and the dogs you registered from the app
              and from your score. This is a soft delete — your data is hidden
              and recoverable by an admin, and shared dogs other people have
              also seen are kept.
            </p>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/50 px-4 py-2 text-destructive text-sm font-semibold hover:bg-destructive/10 transition"
              >
                <Trash2 className="size-4" /> Delete my data
              </button>
            ) : (
              <div className="mt-3 rounded-xl bg-destructive/5 border border-destructive/30 p-3">
                <p className="text-[13.5px] font-medium text-ink mb-2.5">
                  Are you sure? This hides all your dogs and sightings and resets
                  your score.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-60"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Deleting…
                      </>
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
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
