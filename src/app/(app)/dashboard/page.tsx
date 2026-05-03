import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getDogs } from "@/lib/db/dogs";
import { getUserFavorites } from "@/lib/db/favorites";
import { getUserSightings } from "@/lib/db/sightings";
import { getUserScore } from "@/lib/db/users";
import { DashboardHero } from "@/components/dog/dashboard-hero";
import { DailyQuest } from "@/components/dog/daily-quest";
import { StreakBlock } from "@/components/dog/streak-block";
import { ScoreBoard } from "@/components/dog/score-board";
import { Achievements } from "@/components/dog/achievements";
import { MissionsBlock } from "@/components/dog/missions-block";
import { DashboardContent } from "@/components/dog/dashboard-content";
import { OfflineSyncPanel } from "@/components/pwa/offline-sync-panel";
import {
  deriveStreak,
  isDailyQuestComplete,
  isDailyQuestClaimedToday,
  deriveAchievements,
  shortHexId,
} from "@/lib/dashboard";
import type { ScoreResult } from "@/types/database";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [dogs, favoriteIds, sightings, score, profile] = await Promise.all([
    getDogs(),
    getUserFavorites(user.id),
    getUserSightings(user.id),
    getUserScore(user.id).catch(
      (): ScoreResult => ({
        new_dogs: 0,
        new_dogs_points: 0,
        unique_dogs: 0,
        unique_dogs_points: 0,
        total_catches: 0,
        total_catches_points: 0,
        total_score: 0,
      })
    ),
    getCurrentProfile(),
  ]);

  const caughtDogIds = new Set(sightings.map((s) => s.dog_id));
  const streakDays = deriveStreak(sightings);
  const questComplete = isDailyQuestComplete(sightings);
  const questClaimedToday = isDailyQuestClaimedToday(
    profile?.quest_last_claimed_date
  );
  const achievements = deriveAchievements({
    newDogs: score.new_dogs,
    uniqueDogs: score.unique_dogs,
    totalCatches: score.total_catches,
    streakDays,
  });

  const nickname =
    profile?.nickname ?? user.email?.split("@")[0] ?? "Operator";

  return (
    <div className="px-4 py-4 space-y-4">
      <OfflineSyncPanel />
      <DashboardHero
        score={score}
        nickname={nickname}
        shortId={shortHexId(user.id)}
        streakDays={streakDays}
      />
      <DailyQuest complete={questComplete} claimedToday={questClaimedToday} />
      {streakDays > 0 && (
        <StreakBlock days={streakDays} todayLocked={questComplete} />
      )}
      <ScoreBoard score={score} />
      <Achievements achievements={achievements} />
      <MissionsBlock />
      <DashboardContent
        dogs={dogs}
        userId={user.id}
        favoriteIds={favoriteIds}
        caughtDogIds={Array.from(caughtDogIds)}
      />
    </div>
  );
}
