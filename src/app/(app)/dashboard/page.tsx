import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getDashboardPayload } from "@/lib/db/dashboard";
import { getUserSightings } from "@/lib/db/sightings";
import { DashboardHero } from "@/components/dog/dashboard-hero";
import { DailyQuest } from "@/components/dog/daily-quest";
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Two real network calls: the composite dashboard RPC (dogs + favorites
  // + caught_ids + score) and the user's sightings (for streak + quest).
  // Profile is React-cached from the layout, so it's effectively free.
  const [dashboard, sightings, profile] = await time(
    "dash.parallel-total",
    () =>
      Promise.all([
        time("dash.composite", () => getDashboardPayload(60)),
        time("dash.sightings", () => getUserSightings(user.id)),
        time("dash.profile", () => getCurrentProfile()),
      ])
  );
  console.log(
    `[perf] dash.context dogs=${dashboard.dogs.length} sightings=${sightings.length}`
  );

  const { dogs, favorite_ids, caught_dog_ids, score } = dashboard;

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
      <DashboardHero
        score={score}
        nickname={profile?.nickname ?? user.email?.split("@")[0] ?? "Operator"}
        shortId={shortHexId(user.id)}
        streakDays={streakDays}
      />
      <Achievements achievements={achievements} score={score} />
      <DailyQuest complete={questComplete} claimedToday={questClaimedToday} />
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
        favoriteIds={favorite_ids}
        caughtDogIds={caught_dog_ids}
      />
    </div>
  );
}
