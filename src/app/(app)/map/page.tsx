import dynamic from "next/dynamic";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DOG_MARKER_COLUMNS, type DogMarker } from "@/types/database";
import {
  getDistricts,
  getMissionsView,
  getCreditedDogIds,
} from "@/lib/missions";

// Leaflet ships ~150kB and only renders client-side. Keep it out of the
// server bundle — and out of every other route's chunks.
const DogMap = dynamic(() => import("@/components/map/dog-map"));

async function getDogMarkers(): Promise<DogMarker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select(DOG_MARKER_COLUMNS)
    .not("last_latitude", "is", null)
    .not("last_longitude", "is", null);
  if (error) {
    console.error("[map] failed to fetch dogs:", error.message);
    return [];
  }
  return (data ?? []) as DogMarker[];
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string }>;
}) {
  const params = await searchParams;
  const slugParam = params.mission ?? null;

  // Mission overlay only fetches data when the URL says so. Plain /map stays
  // as fast as before.
  let missionContext = null;
  let creditedSet: Set<string> | null = null;
  let locale = "en";
  if (slugParam) {
    const [view, loc] = await Promise.all([getMissionsView(), getLocale()]);
    locale = loc;
    if (view.active && view.active.slug === slugParam) {
      const districts = getDistricts();
      creditedSet = await getCreditedDogIds(
        view.active.slug,
        view.active.startedAt
      );
      missionContext = {
        slug: view.active.slug,
        nameEn: view.active.name_en,
        nameKa: view.active.name_ka,
        nameRu: view.active.name_ru,
        progress: view.active.progress,
        target: view.active.target,
        completionXp: view.active.completionXp,
        allDistricts: districts.map((d) => ({
          slug: d.slug,
          ring: d.ring,
        })),
        locale,
        // Active mission: render the user's geolocation as a "you are
        // here" marker so the explorer can navigate without seeing the
        // dogs they haven't yet found.
        showUserLocation: true,
      };
    } else {
      // Slug doesn't match the active mission — render the polygon for
      // browsing context but no progress UI.
      const districts = getDistricts();
      const target = districts.find((d) => d.slug === slugParam);
      if (target) {
        missionContext = {
          slug: target.slug,
          nameEn: target.name_en,
          nameKa: target.name_ka,
          nameRu: target.name_ru,
          progress: 0,
          target: 20,
          completionXp: 50,
          allDistricts: districts.map((d) => ({
            slug: d.slug,
            ring: d.ring,
          })),
          locale,
          previewOnly: true,
          showUserLocation: false,
        };
      }
    }
  }

  const dogs = await getDogMarkers();

  // When in active mission, the dog list is reduced to the dogs the user
  // has already credited toward this run — the rest of the raion stays
  // hidden so it's a discovery flow.
  const visibleDogs = creditedSet
    ? dogs.filter((d) => creditedSet!.has(d.id))
    : dogs;

  return (
    <div
      className="w-full relative z-0"
      style={{ height: "calc(100vh - 56px - 64px)" }}
    >
      <DogMap dogs={visibleDogs} mission={missionContext} />
    </div>
  );
}
