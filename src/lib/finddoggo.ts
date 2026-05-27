import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-cache";

export const FINDDOGGO_REWARD_XP = 100;
export const FINDDOGGO_RECENT_SIGHTINGS_LIMIT = 5;

export interface FindDoggoTarget {
  dogId: string;
  earTagId: string | null;
  names: string[];
  primaryImage: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSightingDate: string | null;
  startedAt: string | null;
  recentSightings: {
    id: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    imageUrl: string | null;
  }[];
}

interface DogRow {
  id: string;
  ear_tag_id: string | null;
  names: unknown;
  images: unknown;
  last_latitude: number | null;
  last_longitude: number | null;
  last_sighting_date: string | null;
}

interface SightingRow {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
}

function namesArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function firstImage(v: unknown): string | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const first = v[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url?: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

export async function getActiveFindDoggo(): Promise<FindDoggoTarget | null> {
  const profile = await getCurrentProfile();
  const dogId =
    (profile?.active_finddoggo_dog_id as string | null | undefined) ?? null;
  if (!dogId) return null;

  const startedAt =
    (profile?.active_finddoggo_started_at as string | null | undefined) ?? null;

  const supabase = await createClient();
  const [dogRes, sightingsRes] = await Promise.all([
    supabase
      .from("dogs")
      .select(
        "id, ear_tag_id, names, images, last_latitude, last_longitude, last_sighting_date"
      )
      .eq("id", dogId)
      .single(),
    supabase
      .from("sightings")
      .select("id, timestamp, latitude, longitude, image_url")
      .eq("dog_id", dogId)
      .order("timestamp", { ascending: false })
      .limit(FINDDOGGO_RECENT_SIGHTINGS_LIMIT),
  ]);

  if (dogRes.error || !dogRes.data) return null;
  const dog = dogRes.data as DogRow;
  const sightings = (sightingsRes.data ?? []) as SightingRow[];

  return {
    dogId: dog.id,
    earTagId: dog.ear_tag_id,
    names: namesArray(dog.names),
    primaryImage: firstImage(dog.images),
    lastLatitude: dog.last_latitude,
    lastLongitude: dog.last_longitude,
    lastSightingDate: dog.last_sighting_date,
    startedAt,
    recentSightings: sightings.map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      latitude: s.latitude,
      longitude: s.longitude,
      imageUrl: s.image_url,
    })),
  };
}

export type StartFindDoggoResult =
  | { ok: true; dogId: string; scope: "nearby" | "city" | "existing" }
  | { ok: false; error: "no_candidates" | "unauthorized" | "unknown" };

export async function startFindDoggo(
  lat: number,
  lng: number
): Promise<StartFindDoggoResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_finddoggo", {
    p_lat: lat,
    p_lng: lng,
  });
  if (error) {
    return { ok: false, error: "unknown" };
  }
  const r = data as
    | { ok: boolean; dog_id?: string; scope?: string; error?: string }
    | null;
  if (!r?.ok) {
    const e = r?.error;
    if (e === "no_candidates" || e === "unauthorized") return { ok: false, error: e };
    return { ok: false, error: "unknown" };
  }
  return {
    ok: true,
    dogId: r.dog_id ?? "",
    scope: (r.scope as "nearby" | "city" | "existing") ?? "nearby",
  };
}

export async function giveUpFindDoggo(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("give_up_finddoggo");
  if (error) return false;
  const r = data as { ok?: boolean } | null;
  return !!r?.ok;
}
