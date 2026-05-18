import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-cache";

export const MISSION_TARGET = 5;
export const MISSION_DAILY_CAP = 20;
export const MISSION_COMPLETION_XP = 100;

/**
 * 10-color palette indexed by parent_slug (color_index in mission_districts).
 * Picked for distinguishability on a Carto-style basemap; saturated enough
 * to read at small sizes but desaturated enough that overlapping cells
 * don't blow out the underlying map.
 */
export const PARENT_COLORS = [
  "#22c55e", // chugureti
  "#0ea5e9", // didube
  "#f97316", // gldani
  "#a855f7", // isani
  "#ef4444", // krtsanisi
  "#06b6d4", // mtatsminda
  "#eab308", // nadzaladevi
  "#14b8a6", // saburtalo
  "#ec4899", // samgori
  "#84cc16", // vake
] as const;

export interface ChunkFeature {
  slug: string;
  parentSlug: string;
  parentNameEn: string;
  parentNameKa: string;
  parentNameRu: string;
  index: number;
  colorIndex: number;
  /** Outer ring as [lon, lat] pairs (GeoJSON order). */
  ring: [number, number][];
  /** Pre-computed bbox: [minLon, minLat, maxLon, maxLat]. */
  bbox: [number, number, number, number];
}

function loadChunks(): ChunkFeature[] {
  const file = path.join(process.cwd(), "public", "tbilisi-chunks.geojson");
  const raw = readFileSync(file, "utf8");
  const data = JSON.parse(raw) as {
    features: {
      properties: {
        slug: string;
        parent_slug: string;
        parent_name_en: string;
        parent_name_ka: string;
        parent_name_ru: string;
        index: number;
        color_index: number;
      };
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
      parentSlug: f.properties.parent_slug,
      parentNameEn: f.properties.parent_name_en,
      parentNameKa: f.properties.parent_name_ka,
      parentNameRu: f.properties.parent_name_ru,
      index: f.properties.index,
      colorIndex: f.properties.color_index,
      ring,
      bbox: [minLon, minLat, maxLon, maxLat],
    };
  });
}

let _chunks: ChunkFeature[] | null = null;
export function getChunks(): ChunkFeature[] {
  if (!_chunks) _chunks = loadChunks();
  return _chunks;
}

/** Backwards-compat name used by the sightings route. */
export function getDistricts(): ChunkFeature[] {
  return getChunks();
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
  d: ChunkFeature
): boolean {
  const [minLon, minLat, maxLon, maxLat] = d.bbox;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return false;
  return pointInRing(lon, lat, d.ring);
}

export type MissionStatus = "completed" | "active" | "available";

export interface MissionListItem {
  slug: string;
  parentSlug: string;
  parentNameEn: string;
  parentNameKa: string;
  parentNameRu: string;
  index: number;
  colorIndex: number;
  status: MissionStatus;
}

export interface ActiveMission {
  slug: string;
  parentSlug: string;
  parentNameEn: string;
  parentNameKa: string;
  parentNameRu: string;
  index: number;
  colorIndex: number;
  startedAt: string;
  progress: number;
  target: number;
  awardsToday: number;
  dailyCap: number;
  completionXp: number;
}

export const getMissionsView = cache(
  async (): Promise<{
    list: MissionListItem[];
    active: ActiveMission | null;
  }> => {
    const supabase = await createClient();
    const chunks = getChunks();

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

    const list: MissionListItem[] = chunks.map((c) => {
      let status: MissionStatus = "available";
      if (completedSlugs.has(c.slug)) status = "completed";
      else if (c.slug === activeSlug) status = "active";
      return {
        slug: c.slug,
        parentSlug: c.parentSlug,
        parentNameEn: c.parentNameEn,
        parentNameKa: c.parentNameKa,
        parentNameRu: c.parentNameRu,
        index: c.index,
        colorIndex: c.colorIndex,
        status,
      };
    });

    let active: ActiveMission | null = null;
    if (activeSlug) {
      const c = chunks.find((x) => x.slug === activeSlug);
      if (c) {
        active = {
          slug: c.slug,
          parentSlug: c.parentSlug,
          parentNameEn: c.parentNameEn,
          parentNameKa: c.parentNameKa,
          parentNameRu: c.parentNameRu,
          index: c.index,
          colorIndex: c.colorIndex,
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
