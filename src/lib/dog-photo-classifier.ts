import OpenAI from "openai";
import sharp from "sharp";

interface ClassifyResult {
  ok: boolean;
  /** Short reason why the image was rejected, when ok=false. */
  reason?: string;
}

// Module-level client so the underlying HTTP keep-alive agent is reused
// across invocations instead of reconnecting per request.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Hard ceiling on the OpenAI call so a slow/flaky endpoint fails fast
// instead of holding the lambda open. On timeout we fail OPEN (see below).
const OPENAI_TIMEOUT_MS = 6000;

/**
 * Lightweight subject check for uploaded photos: the only thing it rejects
 * is a photo whose main subject is a person. Everything else passes — a
 * dog, another animal, a street scene, an object. We deliberately do NOT
 * require the photo to "be a dog": that was too strict and bounced
 * legitimate submissions (puppies, distant/partial dogs, odd angles).
 *
 * Explicit-content safety is handled separately and authoritatively by
 * [[image-moderation]] (omni-moderation), which runs in parallel, so this
 * gate is purely about keeping people's selfies/portraits out of the feed.
 *
 * Posture: fails OPEN. This is a content-QUALITY gate, not a safety gate —
 * if the model errors, times out, or the key is missing, we accept rather
 * than block a real dog upload. The safety gate (image-moderation) stays
 * fail-closed.
 */
export async function checkNotHuman(file: File): Promise<ClassifyResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Quality gate only — accept when unconfigured rather than block.
    console.warn(
      "[photo-subject-check] OPENAI_API_KEY not set — passing through"
    );
    return { ok: true };
  }

  // Resize down to ~512px on the long edge before base64-encoding. The
  // check runs at detail:'low', so smaller input is lossless for accuracy
  // and cuts the base64 payload 10-40x.
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
    console.error("[photo-subject-check] failed to read file:", err);
    return { ok: false, reason: "Image could not be read." };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await client.responses.create(
      {
        model: "gpt-5-nano",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You are screening photos submitted to a street-dog " +
                  "logging app. The ONLY thing you reject is a photo whose " +
                  "main subject is a person. Reply with EXACTLY one of " +
                  "these tokens, nothing else:\n" +
                  "  HUMAN — the main subject is a person or people (a " +
                  "selfie, portrait, or group photo of people).\n" +
                  "  OK — anything else (a dog or other animal, a street " +
                  "scene, an object, scenery), including photos where a " +
                  "person only appears incidentally in the background.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_image",
                image_url: dataUrl,
                detail: "low",
              },
            ],
          },
        ],
      },
      { signal: ac.signal }
    );

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
    const verdict = text.trim().toUpperCase();

    if (verdict.startsWith("HUMAN")) {
      return {
        ok: false,
        reason: "Please upload a photo of a dog, not a person.",
      };
    }
    // OK, or anything unparseable: pass through. This is a quality gate, so
    // an ambiguous verdict should not block a legitimate upload.
    if (!verdict.startsWith("OK")) {
      console.warn(
        "[photo-subject-check] unexpected verdict, passing through:",
        verdict
      );
    }
    return { ok: true };
  } catch (err) {
    // Abort (timeout) lands here too — fail OPEN for this quality gate.
    console.error("[photo-subject-check] OpenAI error — passing through:", err);
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}
