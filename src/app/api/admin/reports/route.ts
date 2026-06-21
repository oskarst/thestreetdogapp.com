import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const status = request.nextUrl.searchParams.get("status");
  const admin = createAdminClient();

  let query = admin
    .from("reports")
    .select(
      "*, profiles:user_id(nickname, email), dogs:dog_id(ear_tag_id, names, thumbnail, images, city_slug)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? []).map((r: Record<string, unknown>) => {
    const profiles = r.profiles as { nickname: string | null; email: string } | null;
    const dog = r.dogs as {
      ear_tag_id: string | null;
      names: string[] | null;
      thumbnail: string | null;
      images: string[] | null;
      city_slug: string | null;
    } | null;
    return {
      id: r.id,
      report_type: r.report_type,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
      dog_id: r.dog_id,
      dog_ear_tag: dog?.ear_tag_id ?? null,
      dog_name: dog?.names?.[0] ?? null,
      dog_thumbnail: dog?.thumbnail ?? dog?.images?.[0] ?? null,
      dog_city: dog?.city_slug ?? null,
      user_nickname: profiles?.nickname ?? null,
      user_email: profiles?.email ?? "",
    };
  });

  return NextResponse.json(result);
}
