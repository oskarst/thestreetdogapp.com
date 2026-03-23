import { createClient } from "@/lib/supabase/server";
import type { SightingRow, SightingInsert } from "@/types/database";

export interface SightingWithUser extends SightingRow {
  profiles: { nickname: string | null } | null;
}

export async function getSightingsForDog(
  dogId: string
): Promise<SightingWithUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sightings")
    .select("*, profiles:user_id(nickname)")
    .eq("dog_id", dogId)
    .order("timestamp", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SightingWithUser[];
}

export async function getUserSightings(
  userId: string
): Promise<SightingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sightings")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false });

  if (error) throw error;
  return data ?? [];
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

export async function getRecentSightings(
  dogId: string,
  hours: number
): Promise<SightingRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("sightings")
    .select("*")
    .eq("dog_id", dogId)
    .gte("timestamp", since)
    .order("timestamp", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
