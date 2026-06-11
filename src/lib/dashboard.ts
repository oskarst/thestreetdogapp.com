import type { SightingRow } from "@/types/database";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDayMs(input: Date | string): number {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Level derived from total_score: every 350 points = one level.
 * Level 1 = 0-349 pts, Level 2 = 350-699, etc.
 *
 * Was 100 pts/level; bumped to 350 alongside the ~3.3x scoring rebalance so
 * leveling keeps the same pace (a new dog is now 100 XP, ~3.5 per level, same
 * feel as the old 30 XP at 100-per-level).
 */
export function deriveLevel(totalScore: number) {
  const xpPerLevel = 350;
  const level = Math.floor(totalScore / xpPerLevel) + 1;
  const xpIntoLevel = totalScore % xpPerLevel;
  const xpToNext = xpPerLevel - xpIntoLevel;
  const progress = xpIntoLevel / xpPerLevel; // 0..1
  return { level, xpIntoLevel, xpToNext, xpPerLevel, progress };
}

/**
 * Status titles — one rank every 5 levels, shown next to the level number.
 * Index 0 covers levels 1-5, index 1 covers 6-10, and so on; the last title
 * holds for every level past the ladder. Plain English (not localized yet)
 * since these are short flavour callsigns.
 */
export const STATUS_TITLES = [
  "Pioneer", //                      lvl 1-5
  "Street Scout", //                 lvl 6-10
  "Pack Tracker", //                 lvl 11-15
  "Alley Ranger", //                 lvl 16-20
  "Hound Whisperer", //              lvl 21-25
  "Doggo Guardian", //               lvl 26-30
  "Street Dog Sage", //              lvl 31-35
  "Pawfessor", //                    lvl 36-40
  "Street Dog Professor", //         lvl 41-45
  "Supreme Street Dog Professor", // lvl 46+
] as const;

export const LEVELS_PER_TITLE = 5;

/**
 * Status for a level: current title plus the next one and how many levels
 * away it is (null once the top title is reached).
 */
export function deriveTitle(level: number): {
  title: string;
  tier: number;
  nextTitle: string | null;
  levelsToNextTitle: number | null;
} {
  const rawTier = Math.floor((Math.max(level, 1) - 1) / LEVELS_PER_TITLE);
  const tier = Math.min(rawTier, STATUS_TITLES.length - 1);
  const isTop = tier >= STATUS_TITLES.length - 1;
  const nextTitleLevel = (tier + 1) * LEVELS_PER_TITLE + 1;
  return {
    title: STATUS_TITLES[tier],
    tier,
    nextTitle: isTop ? null : STATUS_TITLES[tier + 1],
    levelsToNextTitle: isTop ? null : nextTitleLevel - level,
  };
}

/**
 * Consecutive-day streak ending today (or yesterday if today is empty so the
 * user doesn't see "0d" the morning after a streak).
 */
export function deriveStreak(sightings: SightingRow[]): number {
  if (sightings.length === 0) return 0;
  const days = new Set(sightings.map((s) => startOfDayMs(s.timestamp)));
  let cursor = startOfDayMs(new Date());
  if (!days.has(cursor)) cursor -= MS_PER_DAY;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= MS_PER_DAY;
  }
  return streak;
}

/**
 * Whether the daily directive — "spot 1 dog today" — is satisfied.
 */
export function isDailyQuestComplete(sightings: SightingRow[]): boolean {
  const today = startOfDayMs(new Date());
  return sightings.some((s) => startOfDayMs(s.timestamp) === today);
}

/**
 * Whether the +5 quest XP has already been awarded for today.
 * The profile column is a YYYY-MM-DD date string; compare to today's local date.
 */
export function isDailyQuestClaimedToday(
  questLastClaimedDate: string | null | undefined
): boolean {
  if (!questLastClaimedDate) return false;
  const today = new Date();
  const todayStr =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  return questLastClaimedDate === todayStr;
}

export interface Achievement {
  id: string;
  name: string;
  /** Threshold value the metric must reach */
  threshold: number;
  /** Current progress toward the threshold */
  progress: number;
  unlocked: boolean;
  iconName:
    | "dog"
    | "paw"
    | "target"
    | "flag"
    | "medal"
    | "fire";
}

interface AchievementInputs {
  newDogs: number;
  uniqueDogs: number;
  totalCatches: number;
  streakDays: number;
}

export function deriveAchievements({
  newDogs,
  uniqueDogs,
  totalCatches,
  streakDays,
}: AchievementInputs): Achievement[] {
  return [
    {
      id: "first_spot",
      name: "First Spot",
      threshold: 1,
      progress: totalCatches,
      unlocked: totalCatches >= 1,
      iconName: "dog",
    },
    {
      id: "ten_spottings",
      name: "10 Spottings",
      threshold: 10,
      progress: totalCatches,
      unlocked: totalCatches >= 10,
      iconName: "paw",
    },
    {
      id: "five_trackers",
      name: "5 Trackers",
      threshold: 5,
      progress: uniqueDogs,
      unlocked: uniqueDogs >= 5,
      iconName: "target",
    },
    {
      id: "five_pioneers",
      name: "5 Pioneers",
      threshold: 5,
      progress: newDogs,
      unlocked: newDogs >= 5,
      iconName: "flag",
    },
    {
      id: "fifty_spottings",
      name: "50 Spottings",
      threshold: 50,
      progress: totalCatches,
      unlocked: totalCatches >= 50,
      iconName: "medal",
    },
    {
      id: "seven_day_streak",
      name: "7-Day Streak",
      threshold: 7,
      progress: streakDays,
      unlocked: streakDays >= 7,
      iconName: "fire",
    },
  ];
}

/**
 * Short hex-style ID for display ("0x4F2A·B7"). Stable per user.
 * Purely cosmetic — derived from the UUID, not authoritative anywhere.
 */
export function shortHexId(uuid: string): string {
  const clean = uuid.replace(/-/g, "").toUpperCase();
  return `0x${clean.slice(0, 4)}·${clean.slice(4, 6)}`;
}
