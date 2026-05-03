import type { SightingRow } from "@/types/database";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDayMs(input: Date | string): number {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Level derived from total_score: every 100 points = one level.
 * Level 1 = 0-99 pts, Level 2 = 100-199, etc.
 */
export function deriveLevel(totalScore: number) {
  const xpPerLevel = 100;
  const level = Math.floor(totalScore / xpPerLevel) + 1;
  const xpIntoLevel = totalScore % xpPerLevel;
  const xpToNext = xpPerLevel - xpIntoLevel;
  const progress = xpIntoLevel / xpPerLevel; // 0..1
  return { level, xpIntoLevel, xpToNext, xpPerLevel, progress };
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
