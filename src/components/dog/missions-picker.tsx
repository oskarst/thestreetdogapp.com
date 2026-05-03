"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MissionsPickerProps {
  available: { slug: string; name: string }[];
  startCta: string;
  pickPrompt: string;
  subtitle: string;
}

/**
 * Inline expand-to-pick: tap "Start a mission" → reveals the available
 * raions as buttons. Tap one → calls start_mission RPC, navigates to
 * /map?mission=slug. Avoids the modal/sheet weight; the dashboard already
 * scrolls and this section grows naturally.
 */
export function MissionsPicker({
  available,
  startCta,
  pickPrompt,
  subtitle,
}: MissionsPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(slug: string) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("start_mission", {
        p_slug: slug,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const result = data as { ok?: boolean; error?: string } | null;
      if (!result?.ok) {
        setError(result?.error ?? "start_failed");
        return;
      }
      router.push(`/map?mission=${slug}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card-soft w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors hover:border-ink/30 active:scale-[0.99]"
      >
        <div>
          <div className="font-semibold text-[14px] leading-tight">
            {startCta}
          </div>
          <div className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground mt-0.5">
            {subtitle}
          </div>
        </div>
        <span className="font-mono text-[var(--green-brand)] text-lg shrink-0">
          ›
        </span>
      </button>
    );
  }

  return (
    <div className="card-soft p-3 space-y-2">
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground px-1">
        {pickPrompt}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {available.map((m) => (
          <button
            key={m.slug}
            onClick={() => pick(m.slug)}
            disabled={pending}
            className="rounded-lg border border-rule-2 bg-card px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-muted transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {m.name}
          </button>
        ))}
      </div>
      {error && (
        <div className="font-mono text-[10px] tracking-[0.04em] text-destructive px-1">
          {error.replace(/_/g, " ")}
        </div>
      )}
      <button
        onClick={() => setOpen(false)}
        className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink"
      >
        ← cancel
      </button>
    </div>
  );
}
