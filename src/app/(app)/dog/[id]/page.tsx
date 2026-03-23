import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDogById } from "@/lib/db/dogs";
import { getSightingsForDog, getRecentSightings } from "@/lib/db/sightings";
import { isFavorite } from "@/lib/db/favorites";
import { getProfile } from "@/lib/db/users";
import { DogImageCarousel } from "@/components/dog/dog-image-carousel";
import { DogDetails } from "@/components/dog/dog-details";
import { SightingList } from "@/components/dog/sighting-list";
import { FavoriteButton } from "@/components/dog/favorite-button";
import { LocationHistoryMap } from "@/components/map/location-history-map";
import { DailyActivityMap } from "@/components/map/daily-activity-map";
import Link from "next/link";
import { PenLine } from "lucide-react";

export default async function DogProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dog = await getDogById(id);
  if (!dog) notFound();

  const [sightings, recentSightings, favorited, registeredByProfile] =
    await Promise.all([
      getSightingsForDog(id),
      getRecentSightings(id, 24),
      isFavorite(user.id, id),
      dog.first_registered_by_id
        ? getProfile(dog.first_registered_by_id)
        : null,
    ]);

  const locations = sightings.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
    timestamp: s.timestamp,
    nickname: s.profiles?.nickname ?? "Anonymous",
    notes: s.notes,
  }));

  const dailySightings = recentSightings.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
    timestamp: s.timestamp,
    nickname: "User",
    notes: s.notes,
  }));

  const showDailyMap = recentSightings.length > 3;

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <DogImageCarousel images={dog.images ?? []} name={dog.names?.[0] ?? "Dog"} />

      <div className="flex items-center gap-2">
        <FavoriteButton
          userId={user.id}
          dogId={dog.id}
          initialFavorited={favorited}
        />
        <Link
          href={`/dog/${dog.id}/name`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors no-underline"
        >
          <PenLine className="h-4 w-4" />
          Name this dog
        </Link>
      </div>

      <DogDetails
        dog={dog}
        totalSightings={sightings.length}
        registeredByNickname={registeredByProfile?.nickname ?? null}
      />

      {locations.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold">
              Location History
              <span className="ml-1 text-muted-foreground font-normal">
                ({locations.length} sightings)
              </span>
            </h3>
          </div>
          <LocationHistoryMap locations={locations} />
        </div>
      )}

      {showDailyMap && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-blue-50 dark:bg-blue-950/30">
            <h3 className="text-sm font-semibold">
              Today&apos;s Activity
              <span className="ml-1 text-muted-foreground font-normal">
                ({recentSightings.length} sightings in last 24h)
              </span>
            </h3>
          </div>
          <DailyActivityMap sightings={dailySightings} />
          <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            Markers numbered from oldest (1) to newest ({recentSightings.length})
            and connected in sequence
          </div>
        </div>
      )}

      <SightingList sightings={sightings} />
    </div>
  );
}
