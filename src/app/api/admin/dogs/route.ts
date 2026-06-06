import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearch } from "@/lib/validate";

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const admin = createAdminClient();

  let query = admin
    .from("dogs")
    .select("*, profiles:first_registered_by_id(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  // Sanitize before string-interpolation into the PostgREST filter — see
  // src/lib/validate.ts for what gets stripped and why.
  const safeSearch = sanitizeSearch(search);
  if (safeSearch) {
    query = query.or(
      `ear_tag_id.ilike.%${safeSearch}%,names.cs.{${safeSearch}}`
    );
  }

  const { data: dogs, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Exact sighting counts for the shown dogs in a single grouped query (see
  // admin_dog_sighting_counts in migration 020) rather than one COUNT
  // round-trip per dog or pulling every sightings row into JS.
  const dogIds = (dogs ?? []).map((d) => d.id);
  const countMap: Record<string, number> = {};
  if (dogIds.length > 0) {
    const { data: counts, error: countError } = await admin.rpc(
      "admin_dog_sighting_counts",
      { p_dog_ids: dogIds }
    );
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    for (const row of (counts ?? []) as { dog_id: string; cnt: number }[]) {
      countMap[row.dog_id] = Number(row.cnt);
    }
  }

  const result = (dogs ?? []).map((dog) => ({
    ...dog,
    sightings_count: countMap[dog.id] ?? 0,
    registered_by_email: (dog as Record<string, unknown>).profiles
      ? ((dog as Record<string, unknown>).profiles as { email: string }).email
      : null,
    profiles: undefined,
  }));

  return NextResponse.json(result);
}
