"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

const STORAGE_KEY = "sd_seen_level";

/**
 * Congratulations splash shown once when the user crosses into a new level.
 * Compares the live level to the last level we recorded in localStorage; on an
 * increase it celebrates, then records the new level so it only fires once.
 * Renders nothing on the server / before the effect runs (no hydration risk).
 */
export function LevelUpSplash({
  level,
  title,
}: {
  level: number;
  title: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let prev: number | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      prev = raw == null ? null : parseInt(raw, 10);
    } catch {
      /* storage unavailable — skip celebration */
    }

    // Record the current level either way so we celebrate each level once.
    try {
      localStorage.setItem(STORAGE_KEY, String(level));
    } catch {
      /* ignore */
    }

    // Only celebrate a real increase (not first-ever load, where prev is null).
    if (prev != null && level > prev) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
    }
  }, [level]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm p-6"
      onClick={() => setShow(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-background border border-rule shadow-2xl px-6 py-8 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-green-soft to-transparent"
        />
        <div className="relative">
          <div className="mx-auto grid place-items-center size-16 rounded-full bg-ink text-background mb-4">
            <Icon name="medal" size={32} />
          </div>
          <div className="font-mono text-[11px] tracking-[0.32em] uppercase text-green-deep">
            Level up
          </div>
          <div className="font-mono font-medium text-[64px] leading-none tracking-[-0.04em] text-ink mt-1">
            {String(level).padStart(2, "0")}
          </div>
          <p className="text-[15px] text-muted-foreground mt-3">
            Congratulations! Now you are
          </p>
          <p className="text-[22px] font-bold tracking-[-0.01em] text-ink mt-0.5">
            {title}
          </p>

          <button
            type="button"
            onClick={() => setShow(false)}
            className="mt-6 w-full rounded-full bg-ink text-background py-3 font-mono text-[12.1px] font-medium tracking-[0.16em] uppercase hover:brightness-110 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
