import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DogCharacter, DogGender, DogAge } from "@/types/database";

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const dogImageFile = formData.get("dogImage") as File | null;
    const earTagImageFile = formData.get("earTagImage") as File | null;
    const earTagId = (formData.get("earTagId") as string) || null;
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    const character = formData.get("character") as DogCharacter;
    const size = parseInt(formData.get("size") as string, 10);
    const gender = formData.get("gender") as DogGender;
    const age = formData.get("age") as DogAge;
    const notes = (formData.get("notes") as string) || null;

    // Validate
    if (!dogImageFile) {
      return NextResponse.json(
        { error: "Dog image is required" },
        { status: 400 }
      );
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Valid location is required" },
        { status: 400 }
      );
    }
    if (!character || !gender || !age || isNaN(size)) {
      return NextResponse.json(
        { error: "All dog attributes are required" },
        { status: 400 }
      );
    }

    // Use admin client for storage uploads (server-side)
    const admin = createAdminClient();

    // Upload dog image
    const dogExt = dogImageFile.name.split(".").pop() ?? "jpg";
    const dogPath = `${user.id}/${Date.now()}.${dogExt}`;
    const dogBuffer = Buffer.from(await dogImageFile.arrayBuffer());

    const { error: dogUploadErr } = await admin.storage
      .from("dogs")
      .upload(dogPath, dogBuffer, {
        contentType: dogImageFile.type,
      });
    if (dogUploadErr) throw dogUploadErr;

    const {
      data: { publicUrl: dogImageUrl },
    } = admin.storage.from("dogs").getPublicUrl(dogPath);

    // Upload ear tag image if provided
    let earTagImageUrl: string | null = null;
    if (earTagImageFile && earTagImageFile.size > 0) {
      const etExt = earTagImageFile.name.split(".").pop() ?? "jpg";
      const etPath = `${user.id}/${Date.now()}_et.${etExt}`;
      const etBuffer = Buffer.from(await earTagImageFile.arrayBuffer());

      const { error: etUploadErr } = await admin.storage
        .from("ear-tags")
        .upload(etPath, etBuffer, {
          contentType: earTagImageFile.type,
        });
      if (etUploadErr) throw etUploadErr;

      const {
        data: { publicUrl },
      } = admin.storage.from("ear-tags").getPublicUrl(etPath);
      earTagImageUrl = publicUrl;
    }

    // Check if dog exists by ear tag
    let dogId: string;
    let isNewDog = false;
    let isFirstCatch = false;

    if (earTagId) {
      const { data: existingDog } = await supabase
        .from("dogs")
        .select("*")
        .eq("ear_tag_id", earTagId)
        .single();

      if (existingDog) {
        dogId = existingDog.id;

        // Check if this is the user's first catch of this dog
        const { count } = await supabase
          .from("sightings")
          .select("*", { count: "exact", head: true })
          .eq("dog_id", dogId)
          .eq("user_id", user.id);

        isFirstCatch = (count ?? 0) === 0;

        // Update dog with new image and location
        const updatedImages = [...(existingDog.images ?? []), dogImageUrl];
        await supabase
          .from("dogs")
          .update({
            images: updatedImages,
            last_latitude: latitude,
            last_longitude: longitude,
            last_sighting_date: new Date().toISOString(),
            character,
            size,
            gender,
            age,
            ear_tag_image: existingDog.ear_tag_image ?? earTagImageUrl,
          })
          .eq("id", dogId);
      } else {
        // Create new dog
        isNewDog = true;
        const { data: newDog, error: createErr } = await supabase
          .from("dogs")
          .insert({
            ear_tag_id: earTagId,
            names: [],
            images: [dogImageUrl],
            ear_tag_image: earTagImageUrl,
            last_latitude: latitude,
            last_longitude: longitude,
            last_sighting_date: new Date().toISOString(),
            character,
            size,
            gender,
            age,
            first_registered_by_id: user.id,
          })
          .select("id")
          .single();

        if (createErr) throw createErr;
        dogId = newDog.id;
      }
    } else {
      // No ear tag — always create new dog
      isNewDog = true;
      const { data: newDog, error: createErr } = await supabase
        .from("dogs")
        .insert({
          names: [],
          images: [dogImageUrl],
          ear_tag_image: earTagImageUrl,
          last_latitude: latitude,
          last_longitude: longitude,
          last_sighting_date: new Date().toISOString(),
          character,
          size,
          gender,
          age,
          first_registered_by_id: user.id,
        })
        .select("id")
        .single();

      if (createErr) throw createErr;
      dogId = newDog.id;
    }

    // Create sighting
    const { error: sightingErr } = await supabase.from("sightings").insert({
      user_id: user.id,
      dog_id: dogId,
      latitude,
      longitude,
      character,
      size,
      gender,
      age,
      notes,
      image_url: dogImageUrl,
      ear_tag_image_url: earTagImageUrl,
    });
    if (sightingErr) throw sightingErr;

    // Calculate points
    let points: number;
    let catchType: "new" | "first_catch" | "repeat";

    if (isNewDog) {
      points = 10;
      catchType = "new";
    } else if (isFirstCatch) {
      points = 5;
      catchType = "first_catch";
    } else {
      points = 1;
      catchType = "repeat";
    }

    return NextResponse.json({ dogId, points, catchType });
  } catch (err) {
    console.error("[POST /api/sightings]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
