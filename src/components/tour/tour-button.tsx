"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DriveStep } from "driver.js";
import { cn } from "@/lib/utils";

interface TourComponentProps {
  userId: string;
}

const TOUR_VERSION = "v1";
const STATE_EVENT = "tour:state";

// One state machine, four resting values:
//   unset     → first launch. Prompt card + pulsing help icon.
//   started   → user said "Yes" on the prompt at least once. Prompt hidden,
//               icon still pulses (they may not have finished).
//   dismissed → user clicked "Dismiss" on the prompt. Prompt hidden, icon
//               stops pulsing (active reject).
//   completed → user reached the final "Let's go!" step. Prompt hidden,
//               icon stops pulsing.
// Stored as `<state>:<TOUR_VERSION>`. Bumping the version resets every
// user back to unset, which is how we re-prompt on a future tour refresh.
type TourState = "unset" | "started" | "dismissed" | "completed";

function storageKey(userId: string) {
  return `tour_state:${userId}`;
}

function readState(userId: string): TourState {
  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    if (stored === `started:${TOUR_VERSION}`) return "started";
    if (stored === `dismissed:${TOUR_VERSION}`) return "dismissed";
    if (stored === `completed:${TOUR_VERSION}`) return "completed";
    return "unset";
  } catch {
    return "unset";
  }
}

function writeState(userId: string, state: Exclude<TourState, "unset">) {
  try {
    window.localStorage.setItem(
      storageKey(userId),
      `${state}:${TOUR_VERSION}`
    );
  } catch {
    /* Safari private mode etc. — silently swallow. */
  }
  // Broadcast so the prompt card and the help icon stay in sync within
  // the same render without prop-drilling or a context provider.
  window.dispatchEvent(new CustomEvent(STATE_EVENT));
}

/**
 * Subscribe a component to the user's tour state. Returns "completed" while
 * SSR / before-mount so we don't flash the pulse or the prompt on hydrate.
 */
function useTourState(userId: string): TourState {
  const [state, setState] = useState<TourState>("completed");
  useEffect(() => {
    setState(readState(userId));
    const refresh = () => setState(readState(userId));
    window.addEventListener(STATE_EVENT, refresh);
    return () => window.removeEventListener(STATE_EVENT, refresh);
  }, [userId]);
  return state;
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
  window.setTimeout(() => {
    target.classList.add("tour-target-pulse");
    window.setTimeout(
      () => target.classList.remove("tour-target-pulse"),
      1600
    );
  }, 650);
}

/**
 * Shared launcher used by the help icon AND the first-launch prompt card.
 * The returned function builds + drives a fresh driver.js instance each
 * time it's called.
 */
function useStartTour(userId: string) {
  const t = useTranslations("tour");
  // driver.js v1 wipes its internal state BEFORE invoking onDestroyed,
  // so getActiveIndex() inside that callback is always undefined. We
  // track "done clicked on last step" through this ref, set from the
  // final step's onNextClick override.
  const completedRef = useRef(false);

  return useCallback(async () => {
    completedRef.current = false;

    // First time the user actively engages with the tour, mark them as
    // started so the prompt card disappears. completed wins over started
    // if the user makes it all the way through.
    if (readState(userId) === "unset") writeState(userId, "started");

    // Lazy-load driver.js only when the user actually opens the tour.
    // Saves ~9 KB gz + 4 KB CSS off every authenticated route's shared
    // chunk; the wait between click and overlay is a single fetch on the
    // happy path, network-idle / preloaded after that.
    const { driver } = await import("driver.js");
    await import("driver.js/dist/driver.css");

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
          writeState(userId, "completed");
          flourishOnFinish();
        }
      },
    });

    d.drive();
  }, [t, userId]);
}

/**
 * Help icon in the TopNav that launches the dashboard walkthrough. Pulses
 * for users whose tour state is `unset` or `started` — i.e. they haven't
 * actively rejected the tour AND haven't completed it. After a completion
 * or a dismiss, it becomes a quiet replay affordance.
 */
export function TourButton({ userId }: TourComponentProps) {
  const t = useTranslations("tour");
  const state = useTourState(userId);
  const start = useStartTour(userId);
  const shouldPulse = state === "unset" || state === "started";

  return (
    <button
      type="button"
      onClick={start}
      aria-label={t("openTour")}
      className={cn(
        "grid place-items-center size-7 rounded-full text-muted-foreground hover:text-ink hover:bg-muted transition-colors shrink-0",
        shouldPulse && "tour-pill-pulse text-amber-brand"
      )}
    >
      <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </button>
  );
}

/**
 * First-launch prompt card. Renders above the Daily Directive on the
 * dashboard only when the user has never engaged with the tour
 * (`tour_state` unset). Two actions:
 *   - "Yes, show me" → starts the tour + state becomes `started`
 *   - "Dismiss"      → state becomes `dismissed`; card never returns
 *
 * Either action persists, so the card never reappears for that user.
 */
export function TourPrompt({ userId }: TourComponentProps) {
  const t = useTranslations("tour");
  const state = useTourState(userId);
  const start = useStartTour(userId);

  if (state !== "unset") return null;

  function handleDismiss() {
    writeState(userId, "dismissed");
  }

  return (
    <section
      className="rounded-2xl border border-amber-brand/40 bg-amber-soft p-3.5 pr-2.5"
      role="region"
      aria-label={t("promptTitle")}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-brand/80 mb-1">
            {t("promptEyebrow")}
          </div>
          <p className="text-[14px] font-semibold leading-snug text-amber-brand">
            {t("promptTitle")}
          </p>
          <p className="text-[12.5px] leading-snug text-amber-brand/85 mt-1">
            {t("promptBody")}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={start}
              className="font-mono text-[11px] font-medium tracking-[0.06em] uppercase px-3 py-1.5 rounded-full bg-amber-brand text-amber-soft hover:brightness-110 transition-all"
            >
              {t("promptYes")}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="font-mono text-[11px] font-medium tracking-[0.06em] uppercase px-3 py-1.5 rounded-full text-amber-brand/80 hover:text-amber-brand hover:bg-amber-brand/10 transition-colors"
            >
              {t("promptDismiss")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("promptDismiss")}
          className="grid place-items-center size-7 rounded-full text-amber-brand/70 hover:text-amber-brand hover:bg-amber-brand/10 transition-colors shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}
