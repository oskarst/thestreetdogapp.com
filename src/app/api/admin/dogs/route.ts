import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const admin = createAdminClient();

  let query = admin
    .from("dogs")
    .select("*, profiles:first_registered_by_id(email)")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `ear_tag_id.ilike.%${search}%,names.cs.{${search}}`
    );
  }

  const { data: dogs, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get sighting counts for each dog
  const dogIds = (dogs ?? []).map((d) => d.id);
  const { data: counts } = await admin
    .from("sightings")
    .select("dog_id")
    .in("dog_id", dogIds.length > 0 ? dogIds : ["__none__"]);

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.dog_id] = (countMap[row.dog_id] ?? 0) + 1;
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
