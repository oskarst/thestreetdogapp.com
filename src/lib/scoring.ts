import type { ScoreResult } from "@/types/database";

export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function getCatchType(
  isNewDog: boolean,
  isFirstCatch: boolean
): { type: "new" | "first" | "again"; points: number; message: string } {
  if (isNewDog) {
    return {
      type: "new",
      points: 10,
      message: "Congratulations! You found a new dog!",
    };
  }
  if (isFirstCatch) {
    return {
      type: "first",
      points: 5,
      message: "You found this dog for the first time!",
    };
  }
  return {
    type: "again",
    points: 1,
    message: "You spotted this dog again!",
  };
}

export function getScoreBreakdown(
  score: ScoreResult
): { label: string; count: number; points: number }[] {
  return [
    {
      label: "New dogs registered",
      count: score.new_dogs,
      points: score.new_dogs_points,
    },
    {
      label: "Unique dogs spotted",
      count: score.unique_dogs,
      points: score.unique_dogs_points,
    },
    {
      label: "Total catches",
      count: score.total_catches,
      points: score.total_catches_points,
    },
  ];
}
