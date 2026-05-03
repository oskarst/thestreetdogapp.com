import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, ScoreResult } from "@/types/database";

/**
 * Public-safe profile lookup. After the security lockdown (migration 005)
 * the authenticated client can only SELECT (id, nickname, role,
 * last_activity, created_at, updated_at, quest_last_claimed_date) — never
 * `email` or other PII. Use `get_my_profile()` RPC for full self-read.
 */
export type PublicProfile = Pick<
  ProfileRow,
  | "id"
  | "nickname"
  | "role"
  | "last_activity"
  | "created_at"
  | "updated_at"
  | "quest_last_claimed_date"
>;

export async function getProfile(
  userId: string
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, role, last_activity, created_at, updated_at, quest_last_claimed_date")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as PublicProfile;
}

export async function updateNickname(
  userId: string,
  nickname: string
): Promise<{ id: string; nickname: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ nickname })
    .eq("id", userId)
    .select("id, nickname")
    .single();

  if (error) throw error;
  return data as { id: string; nickname: string | null };
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
