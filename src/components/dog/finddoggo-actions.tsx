"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface FindDoggoActionsProps {
  /** Currently unused for prefill — completion is matched server-side
   *  by dog_id once the user logs a new sighting. Kept for future deep-link
   *  prefill of the add-dog form. */
  dogId: string;
  /** Pre-fills the ear-tag input on the add-dog form via ?earTag=. */
  earTagId: string | null;
}

export function FindDoggoActions({
  dogId: _dogId,
  earTagId,
}: FindDoggoActionsProps) {
  const router = useRouter();
  const t = useTranslations("missions");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGiveUp() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: rpcErr } = await supabase.rpc("give_up_finddoggo");
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Link
        href={
          earTagId
            ? `/add-dog?earTag=${encodeURIComponent(earTagId)}`
            : "/add-dog"
        }
        className={cn(
          "block w-full text-center px-4 py-3 rounded-full",
          "bg-ink text-background font-semibold text-[14px] no-underline",
          "transition-transform active:scale-[0.98]"
        )}
      >
        {t("finddoggoSpotted")}
      </Link>
      <button
        type="button"
        onClick={handleGiveUp}
        disabled={pending}
        className={cn(
          "block w-full text-center px-4 py-3 rounded-full",
          "bg-transparent border border-rule text-muted-foreground font-medium text-[13px]",
          "transition-colors hover:text-ink hover:border-ink/40 disabled:opacity-60"
        )}
      >
        {pending ? "…" : t("finddoggoGiveUp")}
      </button>
      {error && (
        <div className="font-mono text-[11px] tracking-[0.04em] text-destructive text-center">
          {error}
        </div>
      )}
    </div>
  );
}
