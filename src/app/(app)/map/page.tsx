import dynamic from "next/dynamic";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { type DogMarker } from "@/types/database";
import {
  getChunks,
  getMissionsView,
  getCreditedDogIds,
  getQuadrantDomination,
  PARENT_COLORS,
  MISSION_TARGET,
  MISSION_COMPLETION_XP,
} from "@/lib/missions";

// Leaflet ships ~150kB and only renders client-side. Keep it out of the
// server bundle — and out of every other route's chunks.
const DogMap = dynamic(() => import("@/components/map/dog-map"));

// Minimal column set the markers + side panel actually read: cluster icon
// uses names; the popup uses ear_tag_id, last_sighting_date, and a single
// thumbnail (images[0]). Trimmed from DOG_MARKER_COLUMNS so the growing
// images array doesn't ship in full for every marker.
const MAP_MARKER_COLUMNS =
  "id,ear_tag_id,names,images,last_latitude,last_longitude,last_sighting_date";
// Hard ceiling on markers shipped to the client cluster. Newest sightings
// first so the most relevant dogs survive the cap.
const MAP_MARKER_LIMIT = 2000;

async function getDogMarkers(): Promise<DogMarker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select(MAP_MARKER_COLUMNS)
    .eq("status", "approved")
    .is("deleted_at", null)
    .not("last_latitude", "is", null)
    .not("last_longitude", "is", null)
    .order("last_sighting_date", { ascending: false })
    .limit(MAP_MARKER_LIMIT);
  if (error) {
    console.error("[map] failed to fetch dogs:", error.message);
    return [];
  }
  // Side panel only ever renders images[0]; drop the rest off the wire.
  return ((data ?? []) as DogMarker[]).map((d) => ({
    ...d,
    images: d.images?.length ? [d.images[0]] : [],
  }));
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
    const [view, locale, domination] = await Promise.all([
      getMissionsView(),
      getLocale(),
      getQuadrantDomination(),
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
                dominatedBy: domination[c.slug]?.nickname ?? null,
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
