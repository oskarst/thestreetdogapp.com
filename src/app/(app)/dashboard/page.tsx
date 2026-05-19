import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getDogs } from "@/lib/db/dogs";
import { getUserFavorites } from "@/lib/db/favorites";
import { getUserSightings } from "@/lib/db/sightings";
import { getUserScore } from "@/lib/db/users";
import { DashboardHero } from "@/components/dog/dashboard-hero";
import { DailyQuest } from "@/components/dog/daily-quest";
import { ScoreBoard } from "@/components/dog/score-board";
import { Achievements } from "@/components/dog/achievements";
import { MissionsBlock } from "@/components/dog/missions-block";
import { DashboardContent } from "@/components/dog/dashboard-content";
import { OfflineSyncPanel } from "@/components/pwa/offline-sync-panel";
import { TourPrompt } from "@/components/tour/tour-button";
import {
  isDailyQuestComplete,
  isDailyQuestClaimedToday,
  deriveAchievements,
  deriveStreak,
  shortHexId,
} from "@/lib/dashboard";
import { time } from "@/lib/perf";
import type { ScoreResult } from "@/types/database";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dashStart = performance.now();
  const [dogs, favoriteIds, sightings, score, profile] = await Promise.all([
    time("dash.getDogs", () => getDogs()),
    time("dash.favorites", () => getUserFavorites(user.id)),
    time("dash.sightings", () => getUserSightings(user.id)),
    time("dash.score", () =>
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
      )
    ),
    time("dash.profile", () => getCurrentProfile()),
  ]);
  console.log(
    `[perf] dash.parallel-total = ${Math.round(performance.now() - dashStart)}ms ` +
      `(dogs=${dogs.length}, sightings=${sightings.length})`
  );

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

  return (
    <div className="px-4 py-4 space-y-4">
      <OfflineSyncPanel />
      <TourPrompt userId={user.id} />
      <DailyQuest complete={questComplete} claimedToday={questClaimedToday} />
      <DashboardHero
        score={score}
        nickname={profile?.nickname ?? user.email?.split("@")[0] ?? "Operator"}
        shortId={shortHexId(user.id)}
        streakDays={streakDays}
      />
      <Achievements achievements={achievements} />
      <ScoreBoard score={score} />
      {/* MissionsBlock does its own profile + completions round-trips, so
          let it stream in independently while the rest of the dashboard
          paints. Falls back to a slim placeholder card. */}
      <Suspense
        fallback={
          <div className="rounded-2xl border border-amber-brand/30 bg-amber-soft/60 h-24 animate-pulse" />
        }
      >
        <MissionsBlock />
      </Suspense>
      <DashboardContent
        dogs={dogs}
        userId={user.id}
        favoriteIds={favoriteIds}
        caughtDogIds={Array.from(caughtDogIds)}
      />
    </div>
  );
}
