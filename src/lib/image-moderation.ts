import OpenAI from "openai";
import sharp from "sharp";

interface ModerationResult {
  ok: boolean;
  /** Short reason why the image was rejected, when ok=false. */
  reason?: string;
}

// Module-level client so the underlying HTTP keep-alive agent is reused
// across invocations instead of reconnecting per request.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Hard ceiling on the OpenAI call so a slow/flaky endpoint fails fast
// instead of holding the lambda open. On timeout we fail closed, same as
// any other API error below.
const OPENAI_TIMEOUT_MS = 6000;

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

  // Resize down to ~512px on the long edge before base64-encoding. The
  // moderation classifier doesn't need full resolution, and this cuts the
  // base64 payload 10-40x — a 10MB upload becomes a few tens of KB.
  let dataUrl: string;
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const small = await sharp(raw)
      .rotate() // respect EXIF orientation
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    dataUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
  } catch (err) {
    console.error("[image-moderation] failed to read file:", err);
    return { ok: false, reason: "Image could not be read." };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await client.moderations.create(
      {
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: dataUrl } }],
      },
      { signal: ac.signal }
    );

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
    // Abort (timeout) lands here too — fail closed like any other error.
    console.error("[image-moderation] OpenAI error — failing closed:", err);
    return {
      ok: false,
      reason: "Image moderation is temporarily unavailable. Try again later.",
    };
  } finally {
    clearTimeout(timer);
  }
}
