import dynamic from "next/dynamic";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DOG_MARKER_COLUMNS, type DogMarker } from "@/types/database";
import {
  getDistricts,
  getMissionsProgress,
  getMyDogIdsInDistrict,
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
  const slug = params.mission ?? null;

  // Mission overlay data is only fetched when the user explicitly opted in.
  // Plain /map stays as fast as before.
  let mission = null;
  let myDogIds: string[] = [];
  let districts = null;
  let locale = "en";
  if (slug) {
    [districts, locale] = await Promise.all([
      Promise.resolve(getDistricts()),
      getLocale(),
    ]);
    const progress = await getMissionsProgress();
    const found = progress.find((m) => m.slug === slug);
    if (found) {
      mission = found;
      myDogIds = await getMyDogIdsInDistrict(slug);
    }
  }

  const dogs = await getDogMarkers();

  return (
    <div
      className="w-full relative z-0"
      style={{ height: "calc(100vh - 56px - 64px)" }}
    >
      <DogMap
        dogs={dogs}
        mission={
          mission && districts
            ? {
                slug: mission.slug,
                nameEn: mission.name_en,
                nameKa: mission.name_ka,
                nameRu: mission.name_ru,
                totalDogs: mission.totalDogs,
                mySpotted: mission.mySpotted,
                completed: mission.completed,
                rewardXp: mission.rewardXp,
                myDogIds,
                allDistricts: districts.map((d) => ({
                  slug: d.slug,
                  ring: d.ring,
                })),
                locale,
              }
            : null
        }
      />
    </div>
  );
}
