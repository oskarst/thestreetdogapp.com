import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PenLine, SlidersHorizontal, Flag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { getSightingsForDog, countDogCatchers } from "@/lib/db/sightings";
import { isFavorite } from "@/lib/db/favorites";
import { getProfile } from "@/lib/db/users";
import { DogImageCarousel } from "@/components/dog/dog-image-carousel";
import { DogDetails } from "@/components/dog/dog-details";
import { SightingList } from "@/components/dog/sighting-list";
import { DogActionIcons } from "@/components/dog/dog-action-icons";
import { LocationHistoryMap } from "@/components/map/location-history-map";
import { DailyActivityMap } from "@/components/map/daily-activity-map";
import { SectionLabel } from "@/components/ui/section-label";
import { sampleN } from "@/lib/sample";

export default async function DogProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // user + dog are independent — kick them off together instead of waiting
  // the auth round-trip before starting the dog fetch.
  const [user, dog] = await Promise.all([getCurrentUser(), getDogById(id)]);
  if (!user) redirect("/login");
  if (!dog) notFound();

  // Each sub-query is allowed to fail independently — a missing legacy
  // profile or a flaky RPC shouldn't 500 the whole detail page.
  const safe = async <T,>(p: Promise<T>, label: string, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      console.error(`[dog/${id}] ${label} failed:`, err);
      return fallback;
    }
  };

  const [sightings, favorited, registeredByProfile, totalCatchers] =
    await Promise.all([
      safe(getSightingsForDog(id), "getSightingsForDog", []),
      safe(isFavorite(user.id, id), "isFavorite", false),
      dog.first_registered_by_id
        ? safe(getProfile(dog.first_registered_by_id), "getProfile", null)
        : null,
      safe(countDogCatchers(id), "countDogCatchers", 0),
    ]);

  const caughtByYou = sightings.some((s) => s.is_mine);
  const canEdit = caughtByYou || dog.first_registered_by_id === user.id;

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
      {/* Cap the gallery at 8 randomly-sampled photos so a heavily-sighted
          dog (one image per sighting, unbounded) doesn't mount dozens of
          slides + optimizer transforms. The ear-tag shot is always shown. */}
      <DogImageCarousel
        images={sampleN(dog.images ?? [], 8)}
        name={dog.names?.[0] ?? "Dog"}
        earTagImage={dog.ear_tag_image}
      />

      <div className="flex items-center flex-wrap gap-2">
        <DogActionIcons
          userId={user.id}
          dogId={dog.id}
          isFavorited={favorited}
          size="md"
        />
        <Link
          href={`/dog/${dog.id}/name`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-muted transition-colors no-underline"
        >
          <PenLine className="h-4 w-4" />
          Name this dog
        </Link>
        {canEdit && (
          <Link
            href={`/dog/${dog.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-muted transition-colors no-underline"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Edit details
          </Link>
        )}
        <Link
          href={`/dog/${dog.id}/report`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-ink hover:bg-muted transition-colors no-underline"
        >
          <Flag className="h-4 w-4" />
          Report bad data
        </Link>
      </div>

      <DogDetails
        dog={dog}
        totalSightings={sightings.length}
        totalCatchers={totalCatchers}
        registeredByNickname={registeredByProfile?.nickname ?? null}
        registrarIsYou={dog.first_registered_by_id === user.id}
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
            <div className="px-3 py-2 border-t border-rule bg-background font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
              markers numbered oldest (1) to newest ({recentSightings.length})
            </div>
          </div>
        </div>
      )}

      <SightingList sightings={sightings} />
    </div>
  );
}
