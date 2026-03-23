import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();

  // Delete sightings first (in case FK doesn't cascade)
  await admin.from("sightings").delete().eq("dog_id", id);
  // Delete favorites
  await admin.from("favorites").delete().eq("dog_id", id);
  // Delete dog
  const { error } = await admin.from("dogs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
