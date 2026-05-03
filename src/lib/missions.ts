import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DOG_MARKER_COLUMNS } from "@/types/database";

export interface DistrictFeature {
  slug: string;
  name_en: string;
  name_ka: string;
  name_ru: string;
  /** Outer ring as [lon, lat] pairs (GeoJSON order). */
  ring: [number, number][];
  /** Pre-computed bbox: [minLon, minLat, maxLon, maxLat]. */
  bbox: [number, number, number, number];
}

/**
 * Load the static GeoJSON once per server boot. Each feature is normalised
 * into a polygon ring + bbox; the bbox lets us reject most points before
 * running the (more expensive) ray-cast test.
 */
function loadDistricts(): DistrictFeature[] {
  const file = path.join(process.cwd(), "public", "tbilisi-districts.geojson");
  const raw = readFileSync(file, "utf8");
  const data = JSON.parse(raw) as {
    features: {
      properties: { slug: string; name_en: string; name_ka: string; name_ru: string };
      geometry: { type: "Polygon"; coordinates: [number, number][][] };
    }[];
  };
  return data.features.map((f) => {
    const ring = f.geometry.coordinates[0] as [number, number][];
    let minLon = Infinity,
      minLat = Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return {
      slug: f.properties.slug,
      name_en: f.properties.name_en,
      name_ka: f.properties.name_ka,
      name_ru: f.properties.name_ru,
      ring,
      bbox: [minLon, minLat, maxLon, maxLat],
    };
  });
}

let _districts: DistrictFeature[] | null = null;
export function getDistricts(): DistrictFeature[] {
  if (!_districts) _districts = loadDistricts();
  return _districts;
}

/**
 * Standard ray-casting point-in-polygon. Self-contained — no turf.js dep.
 * Coordinates are [lon, lat]; lon plays the role of x, lat the role of y.
 */
export function pointInRing(
  lon: number,
  lat: number,
  ring: [number, number][]
): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInDistrict(
  lon: number,
  lat: number,
  district: DistrictFeature
): boolean {
  const [minLon, minLat, maxLon, maxLat] = district.bbox;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return false;
  return pointInRing(lon, lat, district.ring);
}

export interface MissionProgress {
  slug: string;
  name_en: string;
  name_ka: string;
  name_ru: string;
  totalDogs: number;
  mySpotted: number;
  completed: boolean;
  rewardXp: number;
}

/**
 * Per-request batched mission progress for the calling user. One Supabase
 * round-trip for the dog markers, one for the user's sighted-dog ids, one
 * for already-claimed slugs.
 *
 * "In district" uses dog.last_latitude/last_longitude (same source the map
 * uses). A dog that has moved between raions counts toward whichever raion
 * its current pin is in, not its history — keeps the denominator and
 * numerator consistent.
 */
export const getMissionsProgress = cache(async (): Promise<MissionProgress[]> => {
  const supabase = await createClient();

  const districts = getDistricts();

  const [dogsRes, mineRes, completionsRes] = await Promise.all([
    supabase
      .from("dogs")
      .select(DOG_MARKER_COLUMNS)
      .not("last_latitude", "is", null)
      .not("last_longitude", "is", null),
    supabase.rpc("get_my_caught_dog_ids"),
    supabase.rpc("get_my_mission_completions"),
  ]);

  const dogs = (dogsRes.data ?? []) as {
    id: string;
    last_latitude: number;
    last_longitude: number;
  }[];

  const myDogIds = new Set(
    ((mineRes.data ?? []) as { dog_id: string }[]).map((r) => r.dog_id)
  );

  const completedSlugs = new Set(
    ((completionsRes.data ?? []) as { district_slug: string }[]).map(
      (r) => r.district_slug
    )
  );

  return districts.map((d) => {
    let totalDogs = 0;
    let mySpotted = 0;
    for (const dog of dogs) {
      if (pointInDistrict(dog.last_longitude, dog.last_latitude, d)) {
        totalDogs++;
        if (myDogIds.has(dog.id)) mySpotted++;
      }
    }
    return {
      slug: d.slug,
      name_en: d.name_en,
      name_ka: d.name_ka,
      name_ru: d.name_ru,
      totalDogs,
      mySpotted,
      completed: completedSlugs.has(d.slug),
      rewardXp: 50,
    };
  });
});

/**
 * For the in-map mission overlay: returns the ids of dogs the user has sighted
 * which currently fall inside the named district. The client passes this list
 * back to claim_district_mission so the server can verify ownership before
 * awarding XP.
 */
export async function getMyDogIdsInDistrict(slug: string): Promise<string[]> {
  const district = getDistricts().find((d) => d.slug === slug);
  if (!district) return [];
  const supabase = await createClient();
  const [dogsRes, mineRes] = await Promise.all([
    supabase
      .from("dogs")
      .select(DOG_MARKER_COLUMNS)
      .not("last_latitude", "is", null)
      .not("last_longitude", "is", null),
    supabase.rpc("get_my_caught_dog_ids"),
  ]);
  const dogs = (dogsRes.data ?? []) as {
    id: string;
    last_latitude: number;
    last_longitude: number;
  }[];
  const mine = new Set(
    ((mineRes.data ?? []) as { dog_id: string }[]).map((r) => r.dog_id)
  );
  return dogs
    .filter(
      (d) =>
        mine.has(d.id) &&
        pointInDistrict(d.last_longitude, d.last_latitude, district)
    )
    .map((d) => d.id);
}
