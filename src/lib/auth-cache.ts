import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

/**
 * Per-request cached `auth.getUser()`. React's `cache()` deduplicates
 * within a single server render, so layout + nested page calling this
 * results in exactly one Supabase auth round-trip.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Per-request cached profile fetch keyed off the current session.
 * Returns null if not signed in or the profile row is missing.
 */
export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
});
