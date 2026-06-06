"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Inline "Start" button used on the /missions list page rows. Disabled
 * when another mission is already active (the user must finish or cancel
 * the current one first).
 */
export function MissionStartButton({
  slug,
  label,
  disabled,
}: {
  slug: string;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    if (disabled) return;
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

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={start}
        disabled={disabled || pending}
        className="px-3 py-1.5 rounded-full bg-ink text-background font-mono text-[11px] font-medium tracking-[0.06em] uppercase active:scale-95 transition-transform disabled:opacity-40"
      >
        {pending ? "…" : label}
      </button>
      {error && (
        <span className="font-mono text-[9.9px] text-destructive">
          {error.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
}
