import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDogs } from "@/lib/db/dogs";
import { getUserFavorites } from "@/lib/db/favorites";
import { getUserSightings } from "@/lib/db/sightings";
import { getUserScore } from "@/lib/db/users";
import { ScoreBoard } from "@/components/dog/score-board";
import { DashboardContent } from "@/components/dog/dashboard-content";
import type { ScoreResult } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [dogs, favoriteIds, sightings, score] = await Promise.all([
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
  ]);

  const caughtDogIds = new Set(sightings.map((s) => s.dog_id));

  return (
    <div className="px-4 py-4 space-y-4">
      <ScoreBoard score={score} />
      <DashboardContent
        dogs={dogs}
        userId={user.id}
        favoriteIds={favoriteIds}
        caughtDogIds={Array.from(caughtDogIds)}
      />
    </div>
  );
}
