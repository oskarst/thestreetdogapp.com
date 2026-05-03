import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkNameForProfanity } from "@/lib/moderation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string }
    | null;
  const rawName = body?.name?.trim();
  if (!rawName) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }
  if (rawName.length > 50) {
    return NextResponse.json(
      { error: "Name must be 50 characters or fewer" },
      { status: 400 }
    );
  }

  // Permission check: only the dog's first registrar OR a user who has
  // sighted this dog can add a name.
  const [dogRes, sightingRes] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, names, first_registered_by_id")
      .eq("id", id)
      .single(),
    supabase
      .from("sightings")
      .select("id", { count: "exact", head: true })
      .eq("dog_id", id)
      .eq("user_id", user.id),
  ]);

  if (dogRes.error || !dogRes.data) {
    return NextResponse.json({ error: "Dog not found" }, { status: 404 });
  }
  const dog = dogRes.data;
  const isRegistrar = dog.first_registered_by_id === user.id;
  const isSpotter = (sightingRes.count ?? 0) > 0;
  if (!isRegistrar && !isSpotter) {
    return NextResponse.json(
      {
        error:
          "Only the dog's registrar or someone who has spotted it can add a name.",
      },
      { status: 403 }
    );
  }

  // Profanity / inappropriate-content check across en/ru/ka.
  const moderation = await checkNameForProfanity(rawName);
  if (!moderation.ok) {
    return NextResponse.json(
      { error: moderation.reason ?? "Name flagged as inappropriate" },
      { status: 422 }
    );
  }

  // Append to names[] without duplicates (case-insensitive).
  const existing = (dog.names as string[] | null) ?? [];
  if (existing.some((n) => n.toLowerCase() === rawName.toLowerCase())) {
    return NextResponse.json(
      { error: "That name is already on this dog." },
      { status: 409 }
    );
  }
  const updated = [...existing, rawName];

  const { error: updateErr } = await supabase
    .from("dogs")
    .update({ names: updated })
    .eq("id", id);
  if (updateErr) {
    console.error("[dogs/name] update failed", updateErr);
    return NextResponse.json(
      { error: "Failed to save name. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, names: updated });
}
