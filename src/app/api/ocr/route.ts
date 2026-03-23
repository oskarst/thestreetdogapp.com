import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_OCR_USAGE = 20;

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

    // Rate limit check
    const { data: profile } = await supabase
      .from("profiles")
      .select("ocr_usage_count")
      .eq("id", user.id)
      .single();

    if (profile && profile.ocr_usage_count > MAX_OCR_USAGE) {
      return NextResponse.json(
        { error: "OCR daily limit reached. Please enter the ear tag ID manually." },
        { status: 429 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Image must be JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // Call OpenAI API with gpt-5-nano (matching existing Python OCR)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Read ONLY the number on the ear tag. Digits only.",
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "auto",
            },
          ],
        },
      ],
    });

    // Extract text from response
    let text = "";
    for (const item of response.output) {
      if (item.type === "message") {
        for (const part of item.content) {
          if (part.type === "output_text") {
            text += part.text;
          }
        }
      }
    }

    // Extract only digits (1-8 characters) - strict validation
    const digits = text.replace(/\D/g, "").slice(0, 8);

    if (!digits || !/^\d{1,8}$/.test(digits)) {
      return NextResponse.json({
        success: false,
        error: "No ear tag number found",
      });
    }

    // Increment OCR usage count using admin client
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ ocr_usage_count: (profile?.ocr_usage_count ?? 0) + 1 })
      .eq("id", user.id);

    // Check if a dog with this ear tag already exists
    const { data: existingDog } = await supabase
      .from("dogs")
      .select("id, names")
      .eq("ear_tag_id", digits)
      .single();

    return NextResponse.json({
      success: true,
      earTagId: digits,
      existingDog: existingDog
        ? { id: existingDog.id, name: existingDog.names?.[0] ?? null }
        : null,
    });
  } catch (err) {
    console.error("[POST /api/ocr]", err);
    return NextResponse.json(
      { success: false, error: "OCR processing failed" },
      { status: 500 }
    );
  }
}
