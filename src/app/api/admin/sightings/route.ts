import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sightings")
    .select(
      "id, timestamp, latitude, longitude, image_url, profiles:user_id(nickname, email), dogs:dog_id(ear_tag_id, names)"
    )
    .order("timestamp", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? []).map((s: Record<string, unknown>) => {
    const profiles = s.profiles as { nickname: string | null; email: string } | null;
    const dogs = s.dogs as { ear_tag_id: string | null; names: string[] } | null;
    return {
      id: s.id,
      timestamp: s.timestamp,
      latitude: s.latitude,
      longitude: s.longitude,
      image_url: s.image_url,
      user_nickname: profiles?.nickname ?? null,
      user_email: profiles?.email ?? "",
      dog_ear_tag: dogs?.ear_tag_id ?? null,
      dog_names: dogs?.names ?? [],
    };
  });

  return NextResponse.json(result);
}
