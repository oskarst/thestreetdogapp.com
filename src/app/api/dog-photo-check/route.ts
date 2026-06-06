import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateImage } from "@/lib/image-moderation";
import { checkNotHuman } from "@/lib/dog-photo-classifier";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_CHECK_USAGE = 20;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: newCount, error: rateErr } = await supabase.rpc(
      "try_increment_ocr_usage",
      { p_max: MAX_CHECK_USAGE }
    );
    if (rateErr) {
      console.error("[dog-photo-check] rate-limit rpc failed:", rateErr);
      return NextResponse.json(
        {
          error: `Rate-limit check failed: ${rateErr.message}`,
          code: rateErr.code,
          hint: rateErr.hint,
        },
        { status: 503 }
      );
    }
    if (newCount == null) {
      return NextResponse.json(
        {
          error: "Daily image-check limit reached. Try again tomorrow.",
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Image must be JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }

    // Run the two checks in parallel. moderateImage is the authoritative
    // safety gate (explicit content, fail-closed); checkNotHuman is a light
    // quality gate that only bounces photos of people (fail-open). Reject
    // as soon as either says no.
    const [moderation, subject] = await Promise.all([
      moderateImage(imageFile),
      checkNotHuman(imageFile),
    ]);

    if (!moderation.ok) {
      return NextResponse.json(
        { ok: false, error: moderation.reason },
        { status: 200 }
      );
    }
    if (!subject.ok) {
      return NextResponse.json(
        { ok: false, error: subject.reason },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/dog-photo-check]", err);
    return NextResponse.json(
      { ok: false, error: "Photo check failed" },
      { status: 500 }
    );
  }
}
