import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const { sourceId, targetId } = await request.json();

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: "sourceId and targetId are required" },
      { status: 400 }
    );
  }

  if (sourceId === targetId) {
    return NextResponse.json(
      { error: "Source and target must be different dogs" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Fetch both dogs
  const [{ data: source }, { data: target }] = await Promise.all([
    admin.from("dogs").select("*").eq("id", sourceId).single(),
    admin.from("dogs").select("*").eq("id", targetId).single(),
  ]);

  if (!source) {
    return NextResponse.json({ error: "Source dog not found" }, { status: 404 });
  }
  if (!target) {
    return NextResponse.json({ error: "Target dog not found" }, { status: 404 });
  }

  // 1. Transfer all sightings from source to target
  const { error: sightingsError } = await admin
    .from("sightings")
    .update({ dog_id: targetId })
    .eq("dog_id", sourceId);

  if (sightingsError) {
    return NextResponse.json(
      { error: "Failed to transfer sightings: " + sightingsError.message },
      { status: 500 }
    );
  }

  // 2. Merge names (deduplicate)
  const mergedNames = Array.from(
    new Set([...(target.names ?? []), ...(source.names ?? [])])
  ).filter(Boolean);

  // 3. Merge images (deduplicate)
  const mergedImages = Array.from(
    new Set([...(target.images ?? []), ...(source.images ?? [])])
  ).filter(Boolean);

  // 4. Handle favorites - get source favorites
  const { data: sourceFavorites } = await admin
    .from("favorites")
    .select("*")
    .eq("dog_id", sourceId);

  if (sourceFavorites && sourceFavorites.length > 0) {
    // Get existing target favorites to detect conflicts
    const { data: targetFavorites } = await admin
      .from("favorites")
      .select("user_id")
      .eq("dog_id", targetId);

    const existingUserIds = new Set(
      (targetFavorites ?? []).map((f) => f.user_id)
    );

    // Transfer non-conflicting favorites
    for (const fav of sourceFavorites) {
      if (existingUserIds.has(fav.user_id)) {
        // Conflict: delete the source favorite
        await admin
          .from("favorites")
          .delete()
          .eq("id", fav.id);
      } else {
        // Transfer to target
        await admin
          .from("favorites")
          .update({ dog_id: targetId })
          .eq("id", fav.id);
      }
    }
  }

  // 5. Update target dog with merged data + latest sighting info
  const { data: latestSighting } = await admin
    .from("sightings")
    .select("latitude, longitude, timestamp")
    .eq("dog_id", targetId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  const updateData: Record<string, unknown> = {
    names: mergedNames,
    images: mergedImages,
  };

  if (latestSighting) {
    updateData.last_latitude = latestSighting.latitude;
    updateData.last_longitude = latestSighting.longitude;
    updateData.last_sighting_date = latestSighting.timestamp;
  }

  await admin.from("dogs").update(updateData).eq("id", targetId);

  // 6. Delete the source dog
  await admin.from("dogs").delete().eq("id", sourceId);

  return NextResponse.json({ success: true, targetId });
}
