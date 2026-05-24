import OpenAI from "openai";

interface ModerationResult {
  ok: boolean;
  /** Short reason why the image was rejected, when ok=false. */
  reason?: string;
}

/**
 * Run an image through OpenAI's omni-moderation-latest classifier to
 * flag sexual / violent / self-harm content before it reaches Supabase
 * storage. The moderation endpoint is free and accepts base64 image
 * inputs alongside text.
 *
 * Fails CLOSED on any API/network error — same posture as
 * checkNameForProfanity() in src/lib/moderation.ts. Letting a flagged
 * image through is worse than asking the user to retry.
 */
export async function moderateImage(file: File): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[image-moderation] OPENAI_API_KEY not set — failing closed");
    return {
      ok: false,
      reason: "Image moderation is temporarily unavailable. Try again later.",
    };
  }

  let dataUrl: string;
  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    dataUrl = `data:${file.type};base64,${base64}`;
  } catch (err) {
    console.error("[image-moderation] failed to read file:", err);
    return { ok: false, reason: "Image could not be read." };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: dataUrl } }],
    });

    const result = response.results[0];
    if (!result) {
      console.error("[image-moderation] empty moderation response");
      return { ok: false, reason: "Image moderation failed. Try again." };
    }

    if (result.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([, flagged]) => flagged)
        .map(([name]) => name);
      console.warn("[image-moderation] flagged:", categories.join(", "));
      return {
        ok: false,
        reason: "Image flagged as inappropriate.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[image-moderation] OpenAI error — failing closed:", err);
    return {
      ok: false,
      reason: "Image moderation is temporarily unavailable. Try again later.",
    };
  }
}
