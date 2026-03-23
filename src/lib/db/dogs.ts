import { createClient } from "@/lib/supabase/server";
import type { DogRow, DogInsert, DogUpdate } from "@/types/database";

export async function getDogs(filters?: {
  userId?: string;
  favoriteIds?: string[];
}): Promise<DogRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("dogs")
    .select("*")
    .order("last_sighting_date", { ascending: false, nullsFirst: false });

  if (filters?.userId) {
    query = query.eq("first_registered_by_id", filters.userId);
  }
  if (filters?.favoriteIds && filters.favoriteIds.length > 0) {
    query = query.in("id", filters.favoriteIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getDogById(id: string): Promise<DogRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createDog(data: DogInsert): Promise<DogRow> {
  const supabase = await createClient();
  const { data: dog, error } = await supabase
    .from("dogs")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return dog;
}

export async function updateDog(id: string, data: DogUpdate): Promise<DogRow> {
  const supabase = await createClient();
  const { data: dog, error } = await supabase
    .from("dogs")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return dog;
}

export async function searchDogByEarTag(
  earTagId: string
): Promise<DogRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .eq("ear_tag_id", earTagId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}
