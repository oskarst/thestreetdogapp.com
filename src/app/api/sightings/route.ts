import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistricts, pointInDistrict } from "@/lib/missions";
import { checkHasDog } from "@/lib/dog-photo-classifier";
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
/**
 * Build a 320x320 webp thumbnail from a sanitized image buffer. Called
 * after the main re-encode; failures are non-fatal — we still upload the
 * full-size variant and leave the thumb null.
 */
async function buildThumbnail(jpegBuffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(jpegBuffer)
      .resize({ width: 320, height: 320, fit: "cover", position: "centre" })
      .webp({ quality: 72 })
      .toBuffer();
  } catch (err) {
    console.error("[sightings] thumbnail build failed:", err);
    return null;
  }
}

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
    //
    // The dog and ear-tag re-encodes are independent CPU-bound sharp passes,
    // so run them together rather than serially.
    const hasEarTag = !!(earTagImageFile && earTagImageFile.size > 0);
    const [dogProcessed, earTagResult] = await Promise.all([
      processUploadedImage(dogImageFile),
      hasEarTag
        ? processUploadedImage(earTagImageFile!)
        : Promise.resolve(null),
    ]);
    mark("sharp");

    if (!dogProcessed.ok) {
      return NextResponse.json(
        { error: dogProcessed.error },
        { status: dogProcessed.status }
      );
    }

    let earTagProcessed:
      | { buffer: Buffer; contentType: string; ext: string }
      | null = null;
    if (earTagResult) {
      if (!earTagResult.ok) {
        return NextResponse.json(
          { error: earTagResult.error },
          { status: earTagResult.status }
        );
      }
      earTagProcessed = {
        buffer: earTagResult.buffer,
        contentType: earTagResult.contentType,
        ext: earTagResult.ext,
      };
    }

    // Use admin client for storage uploads (server-side)
    const admin = createAdminClient();

    // The three storage writes — full-size dog, webp thumbnail, optional
    // ear tag — are independent (distinct paths/buckets, no data flows
    // between them) so run them concurrently. The thumbnail sub-task also
    // owns its own sharp re-encode (buildThumbnail), which overlaps with
    // the dog/ear-tag uploads instead of running after them. Path suffixes
    // (.jpg / _thumb.webp / _et.jpg) stay distinct even at the same Date.now().

    // Dog image. Path uses our server-derived ext, never the
    // client-supplied filename.
    const dogPath = `${user.id}/${Date.now()}.${dogProcessed.ext}`;
    const dogUploadTask = (async (): Promise<string> => {
      const { error: dogUploadErr } = await admin.storage
        .from("dogs")
        .upload(dogPath, dogProcessed.buffer, {
          contentType: dogProcessed.contentType,
          // 30 days + immutable. Path embeds Date.now() so the URL is
          // content-addressed — bumping a dog's photo writes a new path.
          cacheControl: "2592000, immutable",
        });
      if (dogUploadErr) throw dogUploadErr;
      const {
        data: { publicUrl },
      } = admin.storage.from("dogs").getPublicUrl(dogPath);
      return publicUrl;
    })();

    // Optional 320x320 webp thumbnail. Best-effort — thumb failure
    // doesn't fail the sighting; clients fall back to images[0].
    const thumbUploadTask = (async (): Promise<string | null> => {
      const thumbBuffer = await buildThumbnail(dogProcessed.buffer);
      if (!thumbBuffer) return null;
      const thumbPath = `${user.id}/${Date.now()}_thumb.webp`;
      const { error: thumbErr } = await admin.storage
        .from("dogs")
        .upload(thumbPath, thumbBuffer, {
          contentType: "image/webp",
          cacheControl: "2592000, immutable",
        });
      if (thumbErr) {
        console.error("[sightings] thumb upload failed:", thumbErr);
        return null;
      }
      const {
        data: { publicUrl },
      } = admin.storage.from("dogs").getPublicUrl(thumbPath);
      return publicUrl;
    })();

    // Ear tag image if provided.
    const earTagUploadTask = (async (): Promise<string | null> => {
      if (!earTagProcessed) return null;
      const etPath = `${user.id}/${Date.now()}_et.${earTagProcessed.ext}`;
      const { error: etUploadErr } = await admin.storage
        .from("ear-tags")
        .upload(etPath, earTagProcessed.buffer, {
          contentType: earTagProcessed.contentType,
          cacheControl: "2592000, immutable",
        });
      if (etUploadErr) throw etUploadErr;
      const {
        data: { publicUrl },
      } = admin.storage.from("ear-tags").getPublicUrl(etPath);
      return publicUrl;
    })();

    const [dogImageUrl, dogThumbnailUrl, earTagImageUrl] = await Promise.all([
      dogUploadTask,
      thumbUploadTask,
      earTagUploadTask,
    ]);
    mark("uploads");

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
            // Refresh thumbnail to the most recent sighting's webp.
            // Falls back to existing if we failed to generate a new one.
            thumbnail: dogThumbnailUrl ?? existingDog.thumbnail ?? null,
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
        // Create new dog. If no dog is visible in the photo, save it
        // privately as 'pending' for admin review instead of publishing it.
        isNewDog = true;
        const newDogStatus = (await checkHasDog(dogImageFile)).hasDog
          ? "approved"
          : "pending";
        const { data: newDog, error: createErr } = await supabase
          .from("dogs")
          .insert({
            ear_tag_id: earTagId,
            names: [],
            images: [dogImageUrl],
            thumbnail: dogThumbnailUrl,
            ear_tag_image: earTagImageUrl,
            last_latitude: latitude,
            last_longitude: longitude,
            last_sighting_date: new Date().toISOString(),
            character,
            size,
            gender,
            age,
            first_registered_by_id: user.id,
            status: newDogStatus,
          })
          .select("id")
          .single();

        if (createErr) throw createErr;
        dogId = newDog.id;
      }
    } else {
      // No ear tag — always create new dog. Hide it for admin review when
      // the photo has no visible dog.
      isNewDog = true;
      const newDogStatus = (await checkHasDog(dogImageFile)).hasDog
        ? "approved"
        : "pending";
      const { data: newDog, error: createErr } = await supabase
        .from("dogs")
        .insert({
          names: [],
          images: [dogImageUrl],
          thumbnail: dogThumbnailUrl,
          ear_tag_image: earTagImageUrl,
          last_latitude: latitude,
          last_longitude: longitude,
          last_sighting_date: new Date().toISOString(),
          character,
          size,
          gender,
          age,
          first_registered_by_id: user.id,
          status: newDogStatus,
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

    // Find Doggo completion: if the user is hunting this exact dog, the RPC
    // is a no-op when the active target is null or a different dog. Cheap
    // single-row check inside SECURITY DEFINER; failures must not break the
    // sighting itself.
    let finddoggoAward: { awarded: number; dogId: string } | null = null;
    try {
      const { data: fddRes } = await supabase.rpc("complete_finddoggo", {
        p_dog_id: dogId,
      });
      const f = fddRes as
        | { ok: boolean; awarded?: number; dog_id?: string }
        | null;
      if (f?.ok && f.awarded && f.awarded > 0) {
        finddoggoAward = { awarded: f.awarded, dogId: f.dog_id ?? dogId };
      }
    } catch (fddErr) {
      console.error("[sightings] finddoggo award failed:", fddErr);
    }
    mark("finddoggo");

    console.log(
      `[perf] sightings.TOTAL = ${Math.round(performance.now() - t0)}ms`
    );

    return NextResponse.json({
      dogId,
      points,
      catchType,
      missionAward,
      finddoggoAward,
    });
  } catch (err) {
    console.error("[POST /api/sightings]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
