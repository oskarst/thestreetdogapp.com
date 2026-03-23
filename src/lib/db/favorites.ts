import { createClient } from "@/lib/supabase/server";

export async function getUserFavorites(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("dog_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.dog_id);
}

export async function toggleFavorite(
  userId: string,
  dogId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check if favorite exists
  const { data: existing, error: fetchError } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("dog_id", dogId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);
    if (deleteError) throw deleteError;
    return false; // removed
  } else {
    const { error: insertError } = await supabase
      .from("favorites")
      .insert({ user_id: userId, dog_id: dogId });
    if (insertError) throw insertError;
    return true; // added
  }
}

export async function isFavorite(
  userId: string,
  dogId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("dog_id", dogId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
