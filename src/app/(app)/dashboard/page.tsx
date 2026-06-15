import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getDashboardPayload } from "@/lib/db/dashboard";
import { getUserSightings } from "@/lib/db/sightings";
import { DashboardHero } from "@/components/dog/dashboard-hero";
import { Achievements } from "@/components/dog/achievements";
import { DailyQuest } from "@/components/dog/daily-quest";
import { MissionsBlock } from "@/components/dog/missions-block";
import { LeaderboardBlock } from "@/components/dog/leaderboard-block";
import { LevelUpSplash } from "@/components/dog/level-up-splash";
import { DashboardContent } from "@/components/dog/dashboard-content";
import { OfflineSyncPanel } from "@/components/pwa/offline-sync-panel";
import { TourPrompt } from "@/components/tour/tour-button";
import {
  deriveAchievements,
  deriveStreak,
  deriveLevel,
  deriveTitle,
  shortHexId,
  isDailyQuestComplete,
  isDailyQuestClaimedToday,
} from "@/lib/dashboard";
import { time } from "@/lib/perf";
import { getViewerMissionAccess } from "@/lib/viewer-city";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("dashboard");
  const { showChunkMissions } = await getViewerMissionAccess();

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
  // Daily directive: only surfaces once the first dog of the day is logged
  // (quest complete) and not yet claimed; otherwise it stays invisible.
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

  const { level } = deriveLevel(score.total_score);

  return (
    <div className="px-4 py-4 space-y-4">
      <LevelUpSplash level={level} title={deriveTitle(level).title} />
      <OfflineSyncPanel />
      <TourPrompt userId={user.id} />
      {/* Researcher Level + Achievements share one card (no gap between
          them); Achievements still folds out on click. */}
      <section className="card-soft p-4 space-y-3" data-tour-id="dashboard-hero">
        <DashboardHero
          score={score}
          nickname={profile?.nickname ?? user.email?.split("@")[0] ?? "Operator"}
          shortId={shortHexId(user.id)}
          streakDays={streakDays}
        />
        <div className="h-px bg-rule" />
        <Achievements achievements={achievements} score={score} />
      </section>
      {/* Daily directive claim — only rendered once the day's first dog is
          logged (and hidden again after claiming). */}
      {questComplete && (
        <DailyQuest complete={questComplete} claimedToday={questClaimedToday} />
      )}
      {/* MissionsBlock is the chunk-based map-domination mission — only shown
          for cities that have mission chunks (Tbilisi). Streams in
          independently; falls back to a slim placeholder card. */}
      {showChunkMissions && (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-rule bg-muted/50 h-24 animate-pulse" />
          }
        >
          <MissionsBlock />
        </Suspense>
      )}
      {/* Leaderboard sits directly under missions — own round-trip, streams in
          independently. */}
      <Suspense
        fallback={
          <div className="rounded-2xl border border-rule bg-muted/50 h-40 animate-pulse" />
        }
      >
        <LeaderboardBlock />
      </Suspense>
      <DashboardContent
        dogs={dogs}
        userId={user.id}
        favoriteIds={favorite_ids}
        caughtDogIds={caught_dog_ids}
      />

      <p className="pt-2 pb-1 text-center font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
        {t("developedBy")}{" "}
        <a
          href="https://developers-alliance.com"
          target="_blank"
          rel="noopener"
          className="underline underline-offset-2 hover:text-ink"
        >
          Developers Alliance
        </a>
      </p>
    </div>
  );
}
