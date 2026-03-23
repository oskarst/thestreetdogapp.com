import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, ScoreResult } from "@/types/database";

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function updateNickname(
  userId: string,
  nickname: string
): Promise<ProfileRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ nickname })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserScore(userId: string): Promise<ScoreResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_score", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data as ScoreResult;
}

export async function getAllUsers(filters?: {
  search?: string;
}): Promise<ProfileRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,nickname.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
