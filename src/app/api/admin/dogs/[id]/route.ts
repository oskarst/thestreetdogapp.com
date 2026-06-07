import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUUID } from "@/lib/validate";
import type {
  DogAge,
  DogCharacter,
  DogGender,
  DogUpdate,
} from "@/types/database";

const ALLOWED_CHARACTERS: DogCharacter[] = [
  "friendly",
  "very_friendly",
  "indifferent",
  "sleeping",
  "afraid",
  "aggressive",
];
const ALLOWED_GENDERS: DogGender[] = ["male", "female", "unknown"];
const ALLOWED_AGES: DogAge[] = ["puppy", "young", "adult", "old"];

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!isUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
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

/**
 * Admin-only attribute edit. Whitelists the fields that can be patched
 * so a curious client can't reach in and rewrite (e.g.)
 * first_registered_by_id or last_sighting_date. Anything not in the
 * whitelist is silently dropped.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!isUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: DogUpdate = { updated_at: new Date().toISOString() };

  // ear_tag_id — null or non-empty trimmed string, max 64 chars
  if ("ear_tag_id" in body) {
    const v = body.ear_tag_id;
    if (v === null || v === "") {
      update.ear_tag_id = null;
    } else if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length === 0) {
        update.ear_tag_id = null;
      } else if (trimmed.length > 64) {
        return NextResponse.json(
          { error: "Ear tag too long" },
          { status: 400 }
        );
      } else {
        update.ear_tag_id = trimmed;
      }
    } else {
      return NextResponse.json(
        { error: "ear_tag_id must be string or null" },
        { status: 400 }
      );
    }
  }

  // names — array of trimmed non-empty strings, capped at 10 (matches
  // the public name-add endpoint's cap in /api/dogs/[id]/name).
  if ("names" in body) {
    if (!Array.isArray(body.names)) {
      return NextResponse.json(
        { error: "names must be an array" },
        { status: 400 }
      );
    }
    const cleaned = (body.names as unknown[])
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 20);
    if (cleaned.length > 10) {
      return NextResponse.json(
        { error: "Too many names (max 10)" },
        { status: 400 }
      );
    }
    update.names = cleaned;
  }

  if ("character" in body) {
    const v = body.character;
    if (v === null || v === "") {
      update.character = null;
    } else if (
      typeof v === "string" &&
      ALLOWED_CHARACTERS.includes(v as DogCharacter)
    ) {
      update.character = v as DogCharacter;
    } else {
      return NextResponse.json(
        { error: "Invalid character" },
        { status: 400 }
      );
    }
  }

  if ("gender" in body) {
    const v = body.gender;
    if (v === null || v === "") {
      update.gender = null;
    } else if (
      typeof v === "string" &&
      ALLOWED_GENDERS.includes(v as DogGender)
    ) {
      update.gender = v as DogGender;
    } else {
      return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    }
  }

  if ("age" in body) {
    const v = body.age;
    if (v === null || v === "") {
      update.age = null;
    } else if (typeof v === "string" && ALLOWED_AGES.includes(v as DogAge)) {
      update.age = v as DogAge;
    } else {
      return NextResponse.json({ error: "Invalid age" }, { status: 400 });
    }
  }

  if ("size" in body) {
    const v = body.size;
    if (v === null) {
      update.size = null;
    } else if (typeof v === "number" && v >= 1 && v <= 10) {
      update.size = Math.round(v);
    } else {
      return NextResponse.json(
        { error: "Size must be 1-10" },
        { status: 400 }
      );
    }
  }

  // status — moderation approve/decline (approved / pending / rejected).
  if ("status" in body) {
    const v = body.status;
    if (v === "approved" || v === "pending" || v === "rejected") {
      update.status = v;
    } else {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 1) {
    // Only updated_at — nothing meaningful to patch.
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dogs")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ear tag is already in use by another dog" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, dog: data });
}
