import OpenAI from "openai";
import sharp from "sharp";

interface ModerationResult {
  ok: boolean;
  /** Short reason why the image was rejected, when ok=false. */
  reason?: string;
  /**
   * True when the classifier could not run (key missing, timeout, API error)
   * and we let the image through anyway. The image is NOT confirmed safe —
   * callers should log an incident for later review.
   */
  degraded?: boolean;
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
 * Fails OPEN when the classifier can't run (key missing, timeout, API/network
 * error): the image is let through with `degraded: true` so a flaky moderation
 * endpoint never blocks a legitimate upload. Callers log an incident on
 * `degraded` so admins can review what slipped through during the outage. A
 * *successful* check that flags sexual content still hard-blocks (ok: false).
 */
export async function moderateImage(file: File): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[image-moderation] OPENAI_API_KEY not set — letting through (degraded)");
    return { ok: true, degraded: true, reason: "moderation_no_api_key" };
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
    // Can't read/re-encode for the check — don't block on our own hiccup.
    console.error("[image-moderation] failed to read file — letting through (degraded):", err);
    return { ok: true, degraded: true, reason: "moderation_read_failed" };
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
      console.error("[image-moderation] empty moderation response — letting through (degraded)");
      return { ok: true, degraded: true, reason: "moderation_empty_response" };
    }

    // Only block genuinely publishable-blocking content (sexual). We
    // deliberately ignore violence / violence-graphic / self-harm: street-dog
    // welfare photos legitimately show injuries, ear-tag notches, and dogs
    // lying still/sleeping, which omni-moderation false-flags as graphic.
    const cats = result.categories as unknown as Record<string, boolean>;
    const blocked = cats["sexual"] === true || cats["sexual/minors"] === true;

    if (blocked) {
      const categories = Object.entries(result.categories)
        .filter(([, flagged]) => flagged)
        .map(([name]) => name);
      console.warn("[image-moderation] blocked:", categories.join(", "));
      return {
        ok: false,
        reason: "Image flagged as inappropriate.",
      };
    }

    return { ok: true };
  } catch (err) {
    // Abort (timeout) lands here too — fail OPEN so an outage never blocks a
    // legitimate upload; the caller logs an incident on `degraded`.
    console.error("[image-moderation] OpenAI error — letting through (degraded):", err);
    return { ok: true, degraded: true, reason: "moderation_api_error" };
  } finally {
    clearTimeout(timer);
  }
}
