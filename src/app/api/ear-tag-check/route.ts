import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateImage } from "@/lib/image-moderation";
import { logModerationIncident } from "@/lib/moderation-incident";

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

    // Atomic, self-resetting per-day rate limit. Reuses the same RPC the
    // old OCR route used — semantics shifted from "OCR call" to "image
    // moderation call" but the abuse-protection envelope is identical.
    const { data: newCount, error: rateErr } = await supabase.rpc(
      "try_increment_ocr_usage",
      { p_max: MAX_CHECK_USAGE }
    );
    if (rateErr) {
      console.error("[ear-tag-check] rate-limit rpc failed:", rateErr);
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

    const moderation = await moderateImage(imageFile);
    if (!moderation.ok) {
      return NextResponse.json(
        { ok: false, error: moderation.reason },
        { status: 200 }
      );
    }

    // Moderation couldn't run but we let the image through — record it.
    if (moderation.degraded) {
      await logModerationIncident({
        userId: user.id,
        stage: "ear-tag-check",
        detail: moderation.reason,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/ear-tag-check]", err);
    return NextResponse.json(
      { ok: false, error: "Image check failed" },
      { status: 500 }
    );
  }
}
