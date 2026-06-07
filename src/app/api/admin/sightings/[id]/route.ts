import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUUID } from "@/lib/validate";
import type { DogAge, DogCharacter, DogGender } from "@/types/database";

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

/**
 * Admin-only sighting edit. Sightings columns character/size/gender/age are
 * NOT NULL, so they can be changed but not cleared; notes is nullable.
 * Whitelisted fields only.
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

  const update: Record<string, unknown> = {};

  if ("character" in body) {
    if (ALLOWED_CHARACTERS.includes(body.character as DogCharacter)) {
      update.character = body.character;
    } else {
      return NextResponse.json({ error: "Invalid character" }, { status: 400 });
    }
  }
  if ("gender" in body) {
    if (ALLOWED_GENDERS.includes(body.gender as DogGender)) {
      update.gender = body.gender;
    } else {
      return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    }
  }
  if ("age" in body) {
    if (ALLOWED_AGES.includes(body.age as DogAge)) {
      update.age = body.age;
    } else {
      return NextResponse.json({ error: "Invalid age" }, { status: 400 });
    }
  }
  if ("size" in body) {
    const v = body.size;
    if (typeof v === "number" && v >= 1 && v <= 10) {
      update.size = Math.round(v);
    } else {
      return NextResponse.json({ error: "Size must be 1-10" }, { status: 400 });
    }
  }
  if ("notes" in body) {
    const v = body.notes;
    if (v === null || v === "") {
      update.notes = null;
    } else if (typeof v === "string" && v.length <= 2000) {
      update.notes = v.trim();
    } else {
      return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
    }
  }
  if ("health_flag" in body) {
    if (typeof body.health_flag === "boolean") {
      update.health_flag = body.health_flag;
    } else {
      return NextResponse.json(
        { error: "health_flag must be boolean" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("sightings").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

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

  const { error } = await admin.from("sightings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
