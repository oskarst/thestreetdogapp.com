import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PenLine, SlidersHorizontal, Flag, MapPin, Home } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById, getSameEarTagDogs } from "@/lib/db/dogs";
import { cityLabel } from "@/lib/cities";
import { getSightingsForDog, countDogCatchers } from "@/lib/db/sightings";
import { isFavorite } from "@/lib/db/favorites";
import { getProfile } from "@/lib/db/users";
import { DogImageCarousel } from "@/components/dog/dog-image-carousel";
import { DogDetails } from "@/components/dog/dog-details";
import { DogActionIcons } from "@/components/dog/dog-action-icons";
import { DogHistorySection } from "@/components/dog/dog-history-section";
import { DeleteMySightingsButton } from "@/components/dog/delete-my-sightings-button";
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

  const isOwner = dog.first_registered_by_id === user.id;
  // Naming is allowed only for the registrar or someone who has sighted this
  // dog — so only show the "Name this dog" action to those users.
  const canName = isOwner || sightings.some((s) => s.is_mine);
  const myCount = sightings.filter((s) => s.is_mine).length;

  // "First seen" = the earliest of the dog's creation date and any sighting on
  // record. Imported dogs were created in-app (e.g. 2026) but carry sightings
  // from years earlier (e.g. 2022), so created_at alone reads wrong.
  const firstSeen = sightings.reduce(
    (min, s) => (s.timestamp < min ? s.timestamp : min),
    dog.created_at
  );

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

  // Gallery pool: every sighting's photo plus any on the dog row, deduped.
  const galleryImages = Array.from(
    new Set([
      ...(dog.images ?? []),
      ...sightings
        .map((s) => s.image_url)
        .filter((u): u is string => Boolean(u)),
    ])
  );

  const dailySightings = recentSightings.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
    timestamp: s.timestamp,
    nickname: "User",
    notes: s.notes,
  }));

  const showDailyMap = recentSightings.length > 3;

  // Same ear-tag in another city (per-city uniqueness, migration 037).
  const sameTagDogs = dog.ear_tag_id
    ? await safe(
        getSameEarTagDogs(dog.ear_tag_id, dog.id),
        "getSameEarTagDogs",
        []
      )
    : [];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Gallery pulls from every sighting's photo (plus any on the dog row),
          deduped, then capped at 8 random so a heavily-sighted dog doesn't
          mount dozens of slides. The ear-tag shot is always shown. */}
      <DogImageCarousel
        images={sampleN(galleryImages, 8)}
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
        {canName && (
          <Link
            href={`/dog/${dog.id}/name`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-muted transition-colors no-underline"
          >
            <PenLine className="h-4 w-4" />
            Name this dog
          </Link>
        )}
        {isOwner && (
          <Link
            href={`/dog/${dog.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-muted transition-colors no-underline"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Edit tag / delete
          </Link>
        )}
        <Link
          href={`/dog/${dog.id}/report`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-ink hover:bg-muted transition-colors no-underline"
        >
          <Flag className="h-4 w-4" />
          Report bad data
        </Link>
        {myCount > 0 && (
          <DeleteMySightingsButton dogId={dog.id} count={myCount} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rule-2 bg-card px-3 py-1.5 font-mono text-[11.6px] font-medium tracking-[0.08em] uppercase text-ink">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {cityLabel(dog.city_slug)}
        </span>
        {dog.in_shelter && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green-brand)]/40 bg-green-soft px-3 py-1.5 font-mono text-[11.6px] font-medium tracking-[0.08em] uppercase text-green-deep">
            <Home className="h-3.5 w-3.5" />
            In shelter
          </span>
        )}
        {dog.ear_tag_id && sameTagDogs.length > 0 && (
          <span className="font-mono text-[11.6px] tracking-[0.04em] text-amber-600">
            Tag {dog.ear_tag_id} also in{" "}
            {sameTagDogs.map((d, i) => (
              <span key={d.id}>
                {i > 0 && ", "}
                <Link
                  href={`/dog/${d.id}`}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  {cityLabel(d.city_slug)}
                </Link>
              </span>
            ))}{" "}
            (different dog)
          </span>
        )}
      </div>

      {dog.in_shelter && dog.shelter_info && (
        <div className="rounded-xl border border-[var(--green-brand)]/30 bg-green-soft px-4 py-3">
          <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-green-deep mb-1">
            Shelter
          </div>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
            {dog.shelter_info}
          </p>
        </div>
      )}

      <DogDetails
        dog={dog}
        totalSightings={sightings.length}
        totalCatchers={totalCatchers}
        registeredByNickname={registeredByProfile?.nickname ?? null}
        registrarIsYou={dog.first_registered_by_id === user.id}
        firstSeen={firstSeen}
      />

      <DogHistorySection
        sightings={sightings}
        locations={locations}
        dailySightings={dailySightings}
        showDailyMap={showDailyMap}
      />
    </div>
  );
}
