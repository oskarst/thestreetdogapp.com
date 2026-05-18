import dynamic from "next/dynamic";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DOG_MARKER_COLUMNS, type DogMarker } from "@/types/database";
import {
  getChunks,
  getMissionsView,
  getCreditedDogIds,
  PARENT_COLORS,
  MISSION_TARGET,
  MISSION_COMPLETION_XP,
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
  searchParams: Promise<{ mission?: string; picker?: string }>;
}) {
  const params = await searchParams;
  const slugParam = params.mission ?? null;
  const pickerMode = params.picker === "1";

  // ----- picker mode: tap a chunk to start a mission -----
  if (pickerMode) {
    const [view, locale] = await Promise.all([
      getMissionsView(),
      getLocale(),
    ]);
    const chunks = getChunks();
    return (
      <div
        className="w-full relative z-0"
        style={{ height: "calc(100vh - 56px - 64px)" }}
      >
        <DogMap
          dogs={[]}
          picker={{
            locale,
            colors: [...PARENT_COLORS],
            hasActive: !!view.active,
            chunks: chunks.map((c) => {
              const item = view.list.find((m) => m.slug === c.slug);
              return {
                slug: c.slug,
                parentSlug: c.parentSlug,
                parentNameEn: c.parentNameEn,
                parentNameKa: c.parentNameKa,
                parentNameRu: c.parentNameRu,
                index: c.index,
                colorIndex: c.colorIndex,
                ring: c.ring,
                status: item?.status ?? "available",
              };
            }),
          }}
        />
      </div>
    );
  }

  // ----- mission overlay or plain /map -----
  let missionContext = null;
  let creditedSet: Set<string> | null = null;
  let locale = "en";
  if (slugParam) {
    const [view, loc] = await Promise.all([getMissionsView(), getLocale()]);
    locale = loc;
    if (view.active && view.active.slug === slugParam) {
      const chunks = getChunks();
      creditedSet = await getCreditedDogIds(
        view.active.slug,
        view.active.startedAt
      );
      missionContext = {
        slug: view.active.slug,
        parentNameEn: view.active.parentNameEn,
        parentNameKa: view.active.parentNameKa,
        parentNameRu: view.active.parentNameRu,
        chunkIndex: view.active.index,
        progress: view.active.progress,
        target: view.active.target,
        completionXp: view.active.completionXp,
        // Render: only the active chunk + its sibling chunks dimmed
        // (parent raion context). Other raions hidden in mission mode.
        allDistricts: chunks
          .filter((c) => c.parentSlug === view.active!.parentSlug)
          .map((c) => ({ slug: c.slug, ring: c.ring })),
        locale,
        showUserLocation: true,
      };
    } else {
      const chunks = getChunks();
      const target = chunks.find((c) => c.slug === slugParam);
      if (target) {
        missionContext = {
          slug: target.slug,
          parentNameEn: target.parentNameEn,
          parentNameKa: target.parentNameKa,
          parentNameRu: target.parentNameRu,
          chunkIndex: target.index,
          progress: 0,
          target: MISSION_TARGET,
          completionXp: MISSION_COMPLETION_XP,
          allDistricts: chunks
            .filter((c) => c.parentSlug === target.parentSlug)
            .map((c) => ({ slug: c.slug, ring: c.ring })),
          locale,
          previewOnly: true,
          showUserLocation: false,
        };
      }
    }
  }

  const dogs = await getDogMarkers();

  // Three rendering modes:
  // - active mission: only dogs already credited to this run (discovery)
  // - preview (browsing a chunk that isn't yours): no dogs, just polygons
  // - plain /map: all dogs
  const visibleDogs = creditedSet
    ? dogs.filter((d) => creditedSet!.has(d.id))
    : missionContext?.previewOnly
      ? []
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
