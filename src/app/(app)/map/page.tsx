import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { DOG_MARKER_COLUMNS, type DogMarker } from "@/types/database";

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

export default async function MapPage() {
  const dogs = await getDogMarkers();

  return (
    <div
      className="w-full relative z-0"
      style={{ height: "calc(100vh - 56px - 64px)" }}
    >
      <DogMap dogs={dogs} />
    </div>
  );
}
