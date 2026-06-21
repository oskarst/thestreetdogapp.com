import { createClient } from "@/lib/supabase/server";
import type {
  DogRow,
  DogListRow,
  DogInsert,
  DogUpdate,
} from "@/types/database";
import { DOG_LIST_COLUMNS } from "@/types/database";

/**
 * List view: returns slim DogListRow projections — drops ear_tag_image,
 * last_lat/lng, character/size/gender/age, updated_at since the listing
 * cards don't render any of those.
 */
export async function getDogs(filters?: {
  userId?: string;
  favoriteIds?: string[];
}): Promise<DogListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("dogs")
    .select(DOG_LIST_COLUMNS)
    .is("deleted_at", null)
    .order("last_sighting_date", { ascending: false, nullsFirst: false });

  if (filters?.userId) {
    query = query.eq("first_registered_by_id", filters.userId);
  }
  if (filters?.favoriteIds && filters.favoriteIds.length > 0) {
    query = query.in("id", filters.favoriteIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DogListRow[];
}

export async function getDogById(id: string): Promise<DogRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Other (non-deleted) dogs that share an ear-tag number with this one.
 * Since ear tags are unique per city (migration 037), every match is in a
 * different city — used to flag "same tag, different city" on the dog page.
 */
export async function getSameEarTagDogs(
  earTagId: string,
  excludeId: string
): Promise<Array<{ id: string; city_slug: string | null; names: string[] }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select("id, city_slug, names")
    .eq("ear_tag_id", earTagId)
    .neq("id", excludeId)
    .is("deleted_at", null);
  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    city_slug: string | null;
    names: string[];
  }>;
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
