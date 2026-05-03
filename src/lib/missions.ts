import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-cache";

export const MISSION_TARGET = 20;
export const MISSION_DAILY_CAP = 20;
export const MISSION_COMPLETION_XP = 50;

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

export type MissionStatus = "completed" | "active" | "available";

export interface MissionListItem {
  slug: string;
  name_en: string;
  name_ka: string;
  name_ru: string;
  status: MissionStatus;
}

export interface ActiveMission {
  slug: string;
  name_en: string;
  name_ka: string;
  name_ru: string;
  startedAt: string;
  progress: number;
  target: number;
  awardsToday: number;
  dailyCap: number;
  completionXp: number;
}

/**
 * Read-only summary for the dashboard MissionsBlock and the /missions page.
 * No "X dogs in district" counts — the v2 mechanic doesn't require knowing
 * the district population, and showing it would just spoil the explore.
 */
export const getMissionsView = cache(
  async (): Promise<{
    list: MissionListItem[];
    active: ActiveMission | null;
  }> => {
    const supabase = await createClient();
    const districts = getDistricts();

    const [profile, completionsRes] = await Promise.all([
      getCurrentProfile(),
      supabase.rpc("get_my_mission_completions"),
    ]);

    const completedSlugs = new Set(
      ((completionsRes.data ?? []) as { district_slug: string }[]).map(
        (r) => r.district_slug
      )
    );

    const activeSlug = (profile?.active_mission_slug as string | null) ?? null;
    const activeStarted =
      (profile?.active_mission_started_at as string | null) ?? null;
    const activeCount =
      (profile?.active_mission_distinct_count as number | null) ?? 0;
    const awardsToday =
      (profile?.active_mission_awards_today as number | null) ?? 0;
    const awardDate =
      (profile?.active_mission_award_date as string | null) ?? null;

    const today = new Date().toISOString().slice(0, 10);
    const awardsTodayEffective = awardDate === today ? awardsToday : 0;

    const list: MissionListItem[] = districts.map((d) => {
      let status: MissionStatus = "available";
      if (completedSlugs.has(d.slug)) status = "completed";
      else if (d.slug === activeSlug) status = "active";
      return {
        slug: d.slug,
        name_en: d.name_en,
        name_ka: d.name_ka,
        name_ru: d.name_ru,
        status,
      };
    });

    let active: ActiveMission | null = null;
    if (activeSlug) {
      const d = districts.find((x) => x.slug === activeSlug);
      if (d) {
        active = {
          slug: d.slug,
          name_en: d.name_en,
          name_ka: d.name_ka,
          name_ru: d.name_ru,
          startedAt: activeStarted ?? "",
          progress: activeCount,
          target: MISSION_TARGET,
          awardsToday: awardsTodayEffective,
          dailyCap: MISSION_DAILY_CAP,
          completionXp: MISSION_COMPLETION_XP,
        };
      }
    }

    return { list, active };
  }
);

/**
 * Dog IDs the user has credited toward the active mission run. Used by the
 * /map view so the mission overlay only shows dogs you've actually found —
 * the raion starts empty and fills in as you spot dogs.
 *
 * Reads mission_dog_credits scoped to the current (slug, started_at).
 */
export async function getCreditedDogIds(
  slug: string,
  startedAt: string
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission_dog_credits")
    .select("dog_id")
    .eq("district_slug", slug)
    .eq("started_at", startedAt);
  if (error) {
    console.error("[missions] getCreditedDogIds failed:", error.message);
    return new Set();
  }
  return new Set(((data ?? []) as { dog_id: string }[]).map((r) => r.dog_id));
}
