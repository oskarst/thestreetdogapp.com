"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { deriveTitle } from "@/lib/dashboard";

const STORAGE_KEY = "sd_seen_level";
const EVENT = "sd:levelup";

/**
 * Announce the user's current level to the globally mounted
 * <LevelUpOverlay>. The overlay compares against the last level recorded
 * in localStorage and celebrates once per increase, so callers can fire
 * this freely — from the catch flow with the fresh API score, or from the
 * dashboard with the server-derived level.
 */
export function announceLevel(level: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { level } }));
}

/**
 * Server-render shim kept for the dashboard: dispatches the level it was
 * rendered with so re-entry still catches level-ups earned elsewhere
 * (another device, admin adjustments). The overlay owns the celebration.
 */
export function LevelUpSplash({ level }: { level: number; title?: string }) {
  useEffect(() => {
    announceLevel(level);
  }, [level]);
  return null;
}

/** Star burst directions for the celebration particles. */
const STARS = [
  { dx: "-130px", dy: "-150px", d: "1.5s" },
  { dx: "140px", dy: "-120px", d: "1.3s" },
  { dx: "-170px", dy: "20px", d: "1.6s" },
  { dx: "170px", dy: "40px", d: "1.4s" },
  { dx: "-90px", dy: "160px", d: "1.5s" },
  { dx: "110px", dy: "150px", d: "1.7s" },
  { dx: "-30px", dy: "-190px", d: "1.2s" },
  { dx: "40px", dy: "190px", d: "1.6s" },
];

/**
 * Global level-up celebration. Mounted once in the (app) layout so it can
 * fire instantly from any route — e.g. over the /dog-caught reward screen
 * the moment the sighting API reports a level increase.
 */
export function LevelUpOverlay() {
  const t = useTranslations("dashboard");
  const [level, setLevel] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onLevel(e: Event) {
      const next = (e as CustomEvent<{ level?: number }>).detail?.level;
      if (typeof next !== "number" || !Number.isFinite(next)) return;

      let prev: number | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        prev = raw == null ? null : parseInt(raw, 10);
      } catch {
        /* storage unavailable — skip celebration */
      }

      // Record the current level either way so we celebrate each level once.
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }

      // Only celebrate a real increase (not first-ever load, where prev is
      // null). Delay slightly so the reward screen lands first and the
      // splash pops on top of it like a proper game moment.
      if (prev != null && next > prev) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setLevel(next), 900);
      }
    }

    window.addEventListener(EVENT, onLevel);
    return () => {
      window.removeEventListener(EVENT, onLevel);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (level == null) return null;

  const { title } = deriveTitle(level);
  const dismiss = () => setLevel(null);

  return (
    <div
      className="lvlup-backdrop fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm p-6"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div aria-hidden className="lvlup-stars">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="lvlup-star"
            style={{ "--dx": s.dx, "--dy": s.dy, "--d": s.d } as React.CSSProperties}
          >
            ✦
          </span>
        ))}
      </div>
      <div
        className="lvlup-card relative w-full max-w-sm rounded-3xl bg-background border border-rule shadow-2xl px-6 py-8 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-green-soft to-transparent"
        />
        <div className="relative">
          <div className="lvlup-medal relative mx-auto grid place-items-center size-16 rounded-full bg-ink text-background mb-4">
            <span className="lvlup-ring" aria-hidden />
            <Icon name="medal" size={32} />
          </div>
          <div className="font-mono text-[11px] tracking-[0.32em] uppercase text-green-deep">
            {t("levelUpKicker")}
          </div>
          <div className="lvlup-num font-mono font-medium text-[64px] leading-none tracking-[-0.04em] text-ink mt-1">
            {String(level).padStart(2, "0")}
          </div>
          <p className="text-[15px] text-muted-foreground mt-3">
            {t("levelUpBody")}
          </p>
          <p className="text-[22px] font-bold tracking-[-0.01em] text-ink mt-0.5">
            {title}
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="mt-6 w-full rounded-full bg-ink text-background py-3 font-mono text-[12.1px] font-medium tracking-[0.16em] uppercase hover:brightness-110 transition"
          >
            {t("levelUpContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
