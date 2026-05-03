"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * Two-button row inside the active-mission card: "Open on map" links to
 * /map?mission=slug; "Cancel" calls cancel_active_mission RPC, no
 * confirmation (re-starting is one tap and no XP is at risk).
 */
export function MissionsActiveActions({ slug }: { slug: string }) {
  const router = useRouter();
  const t = useTranslations("missions");
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.rpc("cancel_active_mission");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/map?mission=${slug}`}
        className="flex-1 text-center bg-ink text-background py-2 rounded-lg font-mono text-[11px] font-medium tracking-[0.06em] uppercase no-underline active:scale-[0.98] transition-transform"
      >
        {t("openOnMap")}
      </Link>
      <button
        onClick={cancel}
        disabled={pending}
        className="px-3 py-2 rounded-lg font-mono text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground hover:text-ink hover:bg-muted transition-colors disabled:opacity-50"
      >
        {t("cancelMission")}
      </button>
    </div>
  );
}
