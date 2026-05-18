"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { driver, type DriveStep } from "driver.js";
import { cn } from "@/lib/utils";

interface TourButtonProps {
  userId: string;
}

const TOUR_VERSION = "v1";

function storageKey(userId: string) {
  return `tour_state:${userId}`;
}

function safeRead(userId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function safeWrite(userId: string, value: string) {
  try {
    window.localStorage.setItem(storageKey(userId), value);
  } catch {
    /* Safari private mode etc. — silently swallow. */
  }
}

/**
 * Reveal the Missions block as the closing flourish of the tour. Smooth
 * scroll the card into view, wait for the scroll to settle, then add a
 * one-shot amber pulse so the user actually sees the highlight (the pulse
 * is short — adding it before the scroll completes would play offscreen).
 */
function flourishOnFinish() {
  const target = document.querySelector<HTMLElement>(
    '[data-tour-id="missions-block"]'
  );
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  // Smooth scroll typically lands in ~400-700ms; wait 650ms then pulse.
  window.setTimeout(() => {
    target.classList.add("tour-target-pulse");
    window.setTimeout(
      () => target.classList.remove("tour-target-pulse"),
      1600
    );
  }, 650);
}

/**
 * Help icon in the TopNav that launches a 4-step driver.js walkthrough of
 * the dashboard. The pill pulses for first-time users until they complete
 * the tour via the final "Let's go!" CTA; after that it stays available
 * as a quiet replay affordance.
 *
 * X / Esc / overlay-click pause the tour for the session — they do not
 * persist anything. Only completing the final step writes `completed:v1`
 * to localStorage. Bumping TOUR_VERSION (e.g. on a copy refresh) will
 * unmark completed users so they see the next tour.
 */
export function TourButton({ userId }: TourButtonProps) {
  const t = useTranslations("tour");
  const [completed, setCompleted] = useState(true); // pessimistic: avoid pre-mount pulse flash
  // driver.js v1 wipes its internal state BEFORE invoking onDestroyed,
  // so getActiveIndex() inside that callback is always undefined. Track
  // "done clicked on last step" via a ref instead, set from the final
  // step's onNextClick.
  const completedRef = useRef(false);

  useEffect(() => {
    const stored = safeRead(userId);
    setCompleted(stored === `completed:${TOUR_VERSION}`);
  }, [userId]);

  const start = useCallback(() => {
    completedRef.current = false;

    const steps: DriveStep[] = [
      {
        element: '[data-tour-id="daily-quest"]',
        popover: {
          title: t("step1Title"),
          description: t("step1Body"),
        },
      },
      {
        element: '[data-tour-id="dashboard-hero"]',
        popover: {
          title: t("step2Title"),
          description: t("step2Body"),
        },
      },
      {
        element: '[data-tour-id="missions-block"]',
        popover: {
          title: t("step3Title"),
          description: t("step3Body"),
        },
      },
      {
        element: '[data-tour-id="dashboard-content"]',
        popover: {
          title: t("step4Title"),
          description: t("step4Body"),
          doneBtnText: t("done"),
          // The final "Let's go!" button. Override the default advance
          // behaviour to mark completion + destroy ourselves; this is
          // the ONLY path that should flag the tour as done. driver.js
          // hands us the driver instance in opts so we don't need to
          // capture it in a closure.
          onNextClick: (_el, _step, opts) => {
            completedRef.current = true;
            opts.driver.destroy();
          },
        },
      },
    ];

    const d = driver({
      showProgress: true,
      // driver.js literal placeholders — kept out of i18n so ICU doesn't
      // try to parse the {{ as an escape. The slash format reads the
      // same in en/ka/ru.
      progressText: "{{current}} / {{total}}",
      nextBtnText: t("next"),
      prevBtnText: t("back"),
      doneBtnText: t("done"),
      popoverClass: "streetdog-tour",
      allowClose: true,
      stagePadding: 6,
      stageRadius: 14,
      smoothScroll: true,
      steps,
      onDestroyed: () => {
        if (completedRef.current) {
          safeWrite(userId, `completed:${TOUR_VERSION}`);
          setCompleted(true);
          flourishOnFinish();
        }
      },
    });

    d.drive();
  }, [t, userId]);

  return (
    <button
      type="button"
      onClick={start}
      aria-label={t("openTour")}
      className={cn(
        "grid place-items-center size-7 rounded-full text-muted-foreground hover:text-ink hover:bg-muted transition-colors shrink-0",
        !completed && "tour-pill-pulse text-amber-brand"
      )}
    >
      <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </button>
  );
}
