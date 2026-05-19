import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DogListRow, ScoreResult } from "@/types/database";

/**
 * Shape returned by the get_my_dashboard() RPC. Mirrors the JSONB the
 * SECURITY DEFINER function builds in migration 016.
 */
export interface DashboardPayload {
  ok: true;
  dogs: (DogListRow & { is_first_found: boolean })[];
  favorite_ids: string[];
  caught_dog_ids: string[];
  score: ScoreResult;
  dog_limit: number;
}

const FALLBACK_SCORE: ScoreResult = {
  new_dogs: 0,
  new_dogs_points: 0,
  unique_dogs: 0,
  unique_dogs_points: 0,
  total_catches: 0,
  total_catches_points: 0,
  total_score: 0,
};

const EMPTY_PAYLOAD: DashboardPayload = {
  ok: true,
  dogs: [],
  favorite_ids: [],
  caught_dog_ids: [],
  score: FALLBACK_SCORE,
  dog_limit: 60,
};

/**
 * Single-call dashboard data fetcher. Collapses the four pre-existing
 * round-trips (dogs / favorites / sightings-caught-ids / score) into one
 * Supabase RPC. React `cache()` deduplicates within a single request.
 *
 * On error returns an empty payload so the page can still render its
 * shell — the previous Promise.all already used per-call .catch() to
 * keep individual failures from 500-ing the route.
 */
export const getDashboardPayload = cache(
  async (limit = 60): Promise<DashboardPayload> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_dashboard", {
      p_limit: limit,
    });
    if (error) {
      console.error("[dashboard] get_my_dashboard failed:", error.message);
      return EMPTY_PAYLOAD;
    }
    const payload = data as DashboardPayload | { ok: false; error: string } | null;
    if (!payload || payload.ok !== true) return EMPTY_PAYLOAD;
    return payload;
  }
);
