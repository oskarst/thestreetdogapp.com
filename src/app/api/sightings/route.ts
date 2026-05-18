import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistricts, pointInDistrict } from "@/lib/missions";
import type { DogCharacter, DogGender, DogAge } from "@/types/database";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Validate and re-encode an uploaded image. Returns a sanitized JPEG
 * buffer with stripped metadata and clamped dimensions, or an error.
 *
 * Re-encoding via sharp is what blocks the "upload SVG/HTML with
 * image/png MIME → stored XSS via public bucket" vector — non-images
 * fail at sharp.metadata().
 */
async function processUploadedImage(
  file: File
): Promise<
  { ok: true; buffer: Buffer; contentType: string; ext: string }
  | { ok: false; error: string; status: number }
> {
  if (file.size === 0) {
    return { ok: false, error: "Image is empty.", status: 400 };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: `Image must be under ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
      status: 413,
    };
  }
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
    return {
      ok: false,
      error: "Image must be JPEG, PNG, or WebP.",
      status: 400,
    };
  }
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const reEncoded = await sharp(raw)
      .rotate() // respect EXIF orientation
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    return {
      ok: true,
      buffer: reEncoded,
      contentType: "image/jpeg",
      ext: "jpg",
    };
  } catch (err) {
    console.error("[sightings] image re-encode failed:", err);
    return {
      ok: false,
      error: "Image could not be processed.",
      status: 400,
    };
  }
}

export async function POST(request: Request) {
  const t0 = performance.now();
  let lastMark = t0;
  const mark = (label: string) => {
    const now = performance.now();
    console.log(`[perf] sightings.${label} = ${Math.round(now - lastMark)}ms`);
    lastMark = now;
  };

  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    mark("auth");

    // Parse FormData
    const formData = await request.formData();
    mark("parse-formdata");
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
    const clientUuid = (formData.get("clientUuid") as string) || null;

    // Idempotent replay: if this clientUuid was already accepted for this
    // user, return the existing dogId without re-inserting. Routes through
    // the find_my_sighting_by_client_uuid RPC since sightings.user_id is
    // no longer SELECT-able from the authenticated session client.
    if (clientUuid) {
      const { data: existingDogId } = await supabase.rpc(
        "find_my_sighting_by_client_uuid",
        { p_client_uuid: clientUuid }
      );
      if (existingDogId) {
        return NextResponse.json({
          dogId: existingDogId as string,
          points: 0,
          catchType: "repeat" as const,
          duplicate: true,
        });
      }
    }

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

    // Process and validate uploads BEFORE touching storage. sharp() throws
    // on non-images, so a request claiming image/png with HTML/SVG body is
    // caught here. Output is normalized JPEG with metadata stripped,
    // dimensions clamped to 2048×2048.
    const dogProcessed = await processUploadedImage(dogImageFile);
    if (!dogProcessed.ok) {
      return NextResponse.json(
        { error: dogProcessed.error },
        { status: dogProcessed.status }
      );
    }
    mark("sharp-dog");

    let earTagProcessed:
      | { buffer: Buffer; contentType: string; ext: string }
      | null = null;
    if (earTagImageFile && earTagImageFile.size > 0) {
      const result = await processUploadedImage(earTagImageFile);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      earTagProcessed = {
        buffer: result.buffer,
        contentType: result.contentType,
        ext: result.ext,
      };
      mark("sharp-eartag");
    }

    // Use admin client for storage uploads (server-side)
    const admin = createAdminClient();

    // Upload dog image. Path uses our server-derived ext, never the
    // client-supplied filename.
    const dogPath = `${user.id}/${Date.now()}.${dogProcessed.ext}`;
    const { error: dogUploadErr } = await admin.storage
      .from("dogs")
      .upload(dogPath, dogProcessed.buffer, {
        contentType: dogProcessed.contentType,
      });
    if (dogUploadErr) throw dogUploadErr;

    const {
      data: { publicUrl: dogImageUrl },
    } = admin.storage.from("dogs").getPublicUrl(dogPath);
    mark("upload-dog");

    // Upload ear tag image if provided
    let earTagImageUrl: string | null = null;
    if (earTagProcessed) {
      const etPath = `${user.id}/${Date.now()}_et.${earTagProcessed.ext}`;
      const { error: etUploadErr } = await admin.storage
        .from("ear-tags")
        .upload(etPath, earTagProcessed.buffer, {
          contentType: earTagProcessed.contentType,
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

        // Check if this is the user's first catch of this dog. Uses the
        // has_user_spotted_dog() RPC because sightings.user_id is no longer
        // SELECT-able from the authenticated client (security lockdown 005).
        const { data: alreadySpotted } = await supabase.rpc(
          "has_user_spotted_dog",
          { p_dog_id: dogId }
        );
        isFirstCatch = !alreadySpotted;

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
    mark("dog-upsert");

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
      client_uuid: clientUuid,
    });
    if (sightingErr) {
      // Concurrent replay raced past the dedupe check and hit the unique index.
      // Treat as duplicate — the other request already succeeded.
      const isUniqueViolation =
        typeof sightingErr === "object" &&
        sightingErr !== null &&
        "code" in sightingErr &&
        (sightingErr as { code?: string }).code === "23505";
      if (clientUuid && isUniqueViolation) {
        return NextResponse.json({
          dogId,
          points: 0,
          catchType: "repeat" as const,
          duplicate: true,
        });
      }
      throw sightingErr;
    }

    // Calculate points. Untagged finds don't mint Pioneer / Tracker
    // bonuses — without an ear tag we can't deduplicate, so each is just
    // a +1 sighting plus the +2 welfare bonus from migration 007/012.
    let points: number;
    let catchType: "new" | "first_catch" | "repeat" | "untagged";

    if (isNewDog && !earTagId) {
      points = 3;
      catchType = "untagged";
    } else if (isNewDog) {
      points = 10;
      catchType = "new";
    } else if (isFirstCatch) {
      points = 5;
      catchType = "first_catch";
    } else {
      points = 1;
      catchType = "repeat";
    }

    // Mission progress: if the user has an active mission AND this
    // sighting falls inside its polygon, hand off to the SECURITY DEFINER
    // RPC. The polygon test runs on the server here so the client can't
    // farm bonus XP for sightings outside the raion.
    let missionAward:
      | {
          awarded: number;
          progress: number;
          target: number;
          completed: boolean;
          completion_bonus: number;
        }
      | null = null;

    try {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("active_mission_slug")
        .eq("id", user.id)
        .single();
      const activeSlug = (profileRow as { active_mission_slug: string | null } | null)
        ?.active_mission_slug;
      if (activeSlug) {
        const district = getDistricts().find((d) => d.slug === activeSlug);
        if (district && pointInDistrict(longitude, latitude, district)) {
          const { data: awardRes } = await supabase.rpc(
            "award_mission_progress",
            { p_dog_id: dogId }
          );
          const a = awardRes as
            | {
                ok: boolean;
                awarded?: number;
                progress?: number;
                target?: number;
                completed?: boolean;
                completion_bonus?: number;
              }
            | null;
          if (a?.ok && a.awarded && a.awarded > 0) {
            missionAward = {
              awarded: a.awarded,
              progress: a.progress ?? 0,
              target: a.target ?? 20,
              completed: a.completed ?? false,
              completion_bonus: a.completion_bonus ?? 0,
            };
          }
        }
      }
    } catch (missionErr) {
      // Mission award failures must not break sighting creation. Log and
      // move on — the user still gets the base sighting points.
      console.error("[sightings] mission award failed:", missionErr);
    }
    mark("mission");
    console.log(
      `[perf] sightings.TOTAL = ${Math.round(performance.now() - t0)}ms`
    );

    return NextResponse.json({ dogId, points, catchType, missionAward });
  } catch (err) {
    console.error("[POST /api/sightings]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
