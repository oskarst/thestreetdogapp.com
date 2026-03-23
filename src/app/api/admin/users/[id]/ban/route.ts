import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "Cannot ban yourself" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Get current ban status
  const { data: profile } = await admin
    .from("profiles")
    .select("is_banned")
    .eq("id", id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_banned: !profile.is_banned })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ is_banned: !profile.is_banned });
}
