import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE = 1000;

/** Read an entire analytics view, paging past PostgREST's 1000-row cap. */
async function fetchAll(view: string): Promise<Record<string, unknown>[]> {
  const admin = createAdminClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(view)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${view}: ${error.message}`);
    const batch = data ?? [];
    rows.push(...(batch as Record<string, unknown>[]));
    if (batch.length < PAGE) break;
  }
  return rows;
}

export const fetchAnalyticsDogs = () => fetchAll("analytics_dogs");
export const fetchAnalyticsSightings = () => fetchAll("analytics_sightings");
