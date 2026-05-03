import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkNameForProfanity } from "@/lib/moderation";
import { isUUID } from "@/lib/validate";

const MAX_NAME_ATTEMPTS_PER_DAY = 20;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

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
  if (rawName.length > 20) {
    return NextResponse.json(
      { error: "Name must be 20 characters or fewer" },
      { status: 400 }
    );
  }

  // Per-user daily rate limit (atomic, self-resetting). Caps OpenAI
  // moderation cost an attacker can drive by spamming this endpoint.
  // The increment runs BEFORE the moderation call so even submissions
  // that ultimately fail moderation still count toward the daily quota.
  const { data: attempt, error: rateErr } = await supabase.rpc(
    "try_increment_name_attempts",
    { p_max: MAX_NAME_ATTEMPTS_PER_DAY }
  );
  if (rateErr) {
    console.error("[dogs/name] rate-limit rpc failed:", rateErr.message);
    return NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }
  if (attempt == null) {
    return NextResponse.json(
      { error: "Daily naming limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Permission check: only the dog's first registrar OR a user who has
  // sighted this dog can add a name.
  const [dogRes, spottedRes] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, names, first_registered_by_id")
      .eq("id", id)
      .single(),
    supabase.rpc("has_user_spotted_dog", { p_dog_id: id }),
  ]);

  if (dogRes.error || !dogRes.data) {
    return NextResponse.json({ error: "Dog not found" }, { status: 404 });
  }
  const dog = dogRes.data;
  const isRegistrar = dog.first_registered_by_id === user.id;
  const isSpotter = spottedRes.data === true;
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

  // Append to names[] without duplicates (case-insensitive). Cap at 10
  // names per dog to prevent unbounded array growth — at 10 someone has
  // had plenty of opportunity to settle on a name.
  const existing = (dog.names as string[] | null) ?? [];
  if (existing.length >= 10) {
    return NextResponse.json(
      {
        error:
          "This dog already has 10 names. Ask an admin to clean up before adding more.",
      },
      { status: 422 }
    );
  }
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
