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
 * Routes through the get_my_profile() RPC (SECURITY DEFINER) — full-row
 * SELECT on profiles is no longer granted to the authenticated client,
 * so direct `.from("profiles").select("*")` would only return nickname/
 * role/etc. and miss email + quest fields.
 */
export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) {
    console.error("[auth-cache] get_my_profile failed:", error.message);
    return null;
  }
  return (data as ProfileRow | null) ?? null;
});
