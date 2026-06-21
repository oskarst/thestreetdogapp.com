import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const LIMIT = 200;

/**
 * Admin-only: list dogs awaiting moderation (no dog detected in the photo).
 * Returns the photo + who submitted it so an admin can approve or decline
 * via PATCH /api/admin/dogs/{id} with { status }.
 */
export async function GET() {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dogs")
    .select(
      "id, names, images, thumbnail, ear_tag_image, ear_tag_id, last_latitude, last_longitude, created_at, first_registered_by_id, profiles:first_registered_by_id(nickname, email)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    names: string[] | null;
    images: string[] | null;
    thumbnail: string | null;
    ear_tag_image: string | null;
    ear_tag_id: string | null;
    last_latitude: number | null;
    last_longitude: number | null;
    created_at: string;
    first_registered_by_id: string | null;
    profiles: { nickname: string | null; email: string | null } | null;
  }>;

  const items = rows.map((d) => ({
    id: d.id,
    name: d.names?.[0] ?? null,
    image: d.thumbnail ?? d.images?.[0] ?? null,
    images: d.images ?? [],
    ear_tag_image: d.ear_tag_image,
    ear_tag_id: d.ear_tag_id,
    latitude: d.last_latitude,
    longitude: d.last_longitude,
    created_at: d.created_at,
    submitted_by: d.profiles?.nickname || d.profiles?.email || "unknown",
  }));

  return NextResponse.json(items);
}
