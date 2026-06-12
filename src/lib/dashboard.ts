import type { SightingRow } from "@/types/database";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDayMs(input: Date | string): number {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Points per level. Round 1000 so the math reads cleanly. */
export const XP_PER_LEVEL = 1000;

/**
 * Level derived from total_score: every 1000 points = one level.
 * Level 1 = 0-999 pts, Level 2 = 1000-1999, etc.
 */
export function deriveLevel(totalScore: number) {
  const xpPerLevel = XP_PER_LEVEL;
  const level = Math.floor(totalScore / xpPerLevel) + 1;
  const xpIntoLevel = totalScore % xpPerLevel;
  const xpToNext = xpPerLevel - xpIntoLevel;
  const progress = xpIntoLevel / xpPerLevel; // 0..1
  return { level, xpIntoLevel, xpToNext, xpPerLevel, progress };
}

/**
 * One name per level, 1 → 20. The last name holds for every level past 20.
 * Plain English flavour callsigns (not localized yet).
 */
export const LEVEL_NAMES = [
  "Stray Spotter", //                 1
  "Paw Apprentice", //                2
  "Street Scout", //                  3
  "Trail Tracker", //                 4
  "Alley Ranger", //                  5
  "Pack Finder", //                   6
  "Kennel Keeper", //                 7
  "Hound Hunter", //                  8
  "Dog Whisperer", //                 9
  "Muzzle Master", //                 10
  "Canine Cartographer", //           11
  "Snout Scholar", //                 12
  "Bark Sage", //                     13
  "Doggo Guardian", //                14
  "Pawthority", //                    15
  "Tail Tactician", //                16
  "Street Dog Sage", //               17
  "Pawfessor", //                     18
  "Dog Professor", //                 19
  "Supreme Street Dog Professor", //  20+
] as const;

/** Name for a level (clamped to the top name past 20). */
export function levelName(level: number): string {
  const i = Math.min(Math.max(level, 1), LEVEL_NAMES.length) - 1;
  return LEVEL_NAMES[i];
}

/** Current level's name plus the next one (null once at the top). */
export function deriveTitle(level: number): {
  title: string;
  nextTitle: string | null;
} {
  const i = Math.min(Math.max(level, 1), LEVEL_NAMES.length) - 1;
  return {
    title: LEVEL_NAMES[i],
    nextTitle: i + 1 < LEVEL_NAMES.length ? LEVEL_NAMES[i + 1] : null,
  };
}

/** Every named level with its XP range — for the /levels page. */
export function levelTable(): {
  level: number;
  name: string;
  minXp: number;
  maxXp: number | null;
}[] {
  return LEVEL_NAMES.map((name, idx) => {
    const level = idx + 1;
    const minXp = idx * XP_PER_LEVEL;
    const isTop = level === LEVEL_NAMES.length;
    return { level, name, minXp, maxXp: isTop ? null : minXp + XP_PER_LEVEL - 1 };
  });
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
