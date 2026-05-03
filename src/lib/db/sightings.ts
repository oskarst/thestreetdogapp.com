import { createClient } from "@/lib/supabase/server";
import type {
  SightingRow,
  SightingInsert,
  DogCharacter,
  DogGender,
  DogAge,
} from "@/types/database";

/**
 * Shape returned by `get_dog_sightings()` RPC. Note: no `user_id` —
 * dropped post-lockdown to prevent cross-user location correlation.
 * Uses `is_mine` boolean instead of comparing user_id client-side.
 */
export interface SightingWithUser {
  id: string;
  dog_id: string;
  latitude: number;
  longitude: number;
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes: string | null;
  image_url: string | null;
  ear_tag_image_url: string | null;
  timestamp: string;
  /** Public nickname of the spotter (or null if profile missing). */
  nickname: string | null;
  /** True if the calling user is the spotter. */
  is_mine: boolean;
}

/**
 * Most recent sightings for a dog with the spotter's nickname.
 * Routes through get_dog_sightings() RPC because the user_id column
 * is no longer SELECT-able from the authenticated client.
 */
export async function getSightingsForDog(
  dogId: string,
  limit = 100
): Promise<SightingWithUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dog_sightings", {
    p_dog_id: dogId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as SightingWithUser[];
}

export async function countDogCatchers(dogId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("count_dog_catchers", {
    p_dog_id: dogId,
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

/**
 * Self's own sightings. Routes through get_my_sightings() RPC since the
 * `user_id` column is no longer readable from the authenticated client
 * even when filtering by it (PostgREST returns the full row).
 */
export async function getUserSightings(
  _userId: string
): Promise<SightingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_sightings");
  if (error) throw error;
  return (data ?? []) as SightingRow[];
}

export async function createSighting(
  data: SightingInsert
): Promise<SightingRow> {
  const supabase = await createClient();
  const { data: sighting, error } = await supabase
    .from("sightings")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return sighting;
}
