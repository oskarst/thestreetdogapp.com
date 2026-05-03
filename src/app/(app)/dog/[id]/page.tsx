import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { getSightingsForDog, countDogCatchers } from "@/lib/db/sightings";
import { isFavorite } from "@/lib/db/favorites";
import { getProfile } from "@/lib/db/users";
import { DogImageCarousel } from "@/components/dog/dog-image-carousel";
import { DogDetails } from "@/components/dog/dog-details";
import { SightingList } from "@/components/dog/sighting-list";
import { FavoriteButton } from "@/components/dog/favorite-button";
import { LocationHistoryMap } from "@/components/map/location-history-map";
import { DailyActivityMap } from "@/components/map/daily-activity-map";
import { SectionLabel } from "@/components/ui/section-label";

export default async function DogProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dog = await getDogById(id);
  if (!dog) notFound();

  const [sightings, favorited, registeredByProfile, totalCatchers] =
    await Promise.all([
      getSightingsForDog(id),
      isFavorite(user.id, id),
      dog.first_registered_by_id
        ? getProfile(dog.first_registered_by_id)
        : null,
      countDogCatchers(id),
    ]);

  const caughtByYou = sightings.some((s) => s.is_mine);

  // Derive last-24h subset from the same fetched list.
  const dayAgoMs = Date.now() - 24 * 60 * 60 * 1000;
  const recentSightings = sightings.filter(
    (s) => new Date(s.timestamp).getTime() >= dayAgoMs
  );

  const locations = sightings.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
    timestamp: s.timestamp,
    nickname: s.nickname ?? "Anonymous",
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
      <DogImageCarousel
        images={dog.images ?? []}
        name={dog.names?.[0] ?? "Dog"}
      />

      <div className="flex items-center gap-2">
        <FavoriteButton
          userId={user.id}
          dogId={dog.id}
          initialFavorited={favorited}
        />
        <Link
          href={`/dog/${dog.id}/name`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-muted transition-colors no-underline"
        >
          <PenLine className="h-4 w-4" />
          Name this dog
        </Link>
      </div>

      <DogDetails
        dog={dog}
        totalSightings={sightings.length}
        totalCatchers={totalCatchers}
        registeredByNickname={registeredByProfile?.nickname ?? null}
        caughtByYou={caughtByYou}
      />

      {locations.length > 0 && (
        <div>
          <SectionLabel meta={`${locations.length} sightings`}>
            Location History
          </SectionLabel>
          <div className="rounded-xl border border-rule overflow-hidden">
            <LocationHistoryMap locations={locations} />
          </div>
        </div>
      )}

      {showDailyMap && (
        <div>
          <SectionLabel meta={`${recentSightings.length} in last 24h`}>
            Today&apos;s Activity
          </SectionLabel>
          <div className="rounded-xl border border-rule overflow-hidden">
            <DailyActivityMap sightings={dailySightings} />
            <div className="px-3 py-2 border-t border-rule bg-background font-mono text-[10px] tracking-[0.04em] text-muted-foreground">
              markers numbered oldest (1) to newest ({recentSightings.length})
            </div>
          </div>
        </div>
      )}

      <SightingList sightings={sightings} />
    </div>
  );
}
