"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { deriveLevel } from "@/lib/dashboard";

const STORAGE_KEY = "sd_seen_xp";

/**
 * XP readout + bar for the dashboard hero. On arrival it "pours in" the
 * points earned since the last visit: the bar and the number animate from
 * the previously seen score (localStorage) to the current one. Crossing a
 * level since last visit pours from empty, matching the new level's bar.
 * First-ever visit and reduced-motion render statically.
 */
export function XpBar({ totalScore }: { totalScore: number }) {
  const t = useTranslations("dashboard");
  const { level, xpIntoLevel, xpPerLevel, xpToNext } = deriveLevel(totalScore);
  const nextLevel = String(level + 1).padStart(2, "0");
  // Initial state equals the server-rendered value so hydration matches;
  // the effect below rewinds and animates only when there's XP to pour.
  const [shownXp, setShownXp] = useState(xpIntoLevel);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    let fromScore: number | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      fromScore = raw == null ? null : parseInt(raw, 10);
    } catch {
      /* storage unavailable — render statically */
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(totalScore));
    } catch {
      /* ignore */
    }

    if (fromScore == null || !Number.isFinite(fromScore)) return;
    if (fromScore >= totalScore) return; // nothing new to pour in
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const prev = deriveLevel(fromScore);
    const startXp = prev.level < level ? 0 : prev.xpIntoLevel;

    const t0 = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShownXp(Math.round(startXp + (xpIntoLevel - startXp) * ease));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShownXp(startXp);
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [totalScore, level, xpIntoLevel]);

  const pct = Math.min((shownXp / xpPerLevel) * 100, 100);

  return (
    <div className="flex-1 min-w-[200px] pb-1.5">
      <div className="flex justify-between font-mono text-[11px] tracking-[0.06em] uppercase text-muted-foreground mb-1.5 gap-2">
        <span>
          <b className="text-ink font-medium">{shownXp}</b> / {xpPerLevel}{" "}
          {t("xp")}
        </span>
        <span>{t("toLevel", { xp: xpToNext, level: nextLevel })}</span>
      </div>
      <div className="relative h-1 bg-rule-2 rounded overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--green-brand)] rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
