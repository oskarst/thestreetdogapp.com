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
// instead of holding the lambda open. On timeout we fail closed, same as
// any other API error below.
const OPENAI_TIMEOUT_MS = 6000;

/**
 * Validate that an uploaded dog photo is (a) actually a dog and (b) not
 * sexual / violent / otherwise unsafe. Uses gpt-5-nano with a strict
 * single-letter response so we can branch on it without JSON parsing.
 *
 * Pairs with [[image-moderation]] for defense in depth: omni-moderation
 * handles the explicit-content layer, this handles the "is this a
 * screenshot of a stapler" layer.
 *
 * Fails CLOSED on any API/network error — same posture as the existing
 * src/lib/moderation.ts name check.
 */
export async function classifyDogPhoto(file: File): Promise<ClassifyResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[dog-photo-classifier] OPENAI_API_KEY not set — failing closed"
    );
    return {
      ok: false,
      reason: "Photo check is temporarily unavailable. Try again later.",
    };
  }

  // Resize down to ~512px on the long edge before base64-encoding. The
  // classifier already runs at detail:'low', so smaller input is lossless
  // for accuracy and cuts the base64 payload 10-40x.
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
    console.error("[dog-photo-classifier] failed to read file:", err);
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
                  "You are validating photos submitted to a street-dog " +
                  "logging app. Look at the image and reply with EXACTLY " +
                  "one of these tokens — nothing else:\n" +
                  "  DOG   — image clearly shows one or more dogs as the " +
                  "subject (any breed, any condition, including puppies).\n" +
                  "  NOT_DOG — no dog is visible, or the dog is not the " +
                  "subject (e.g. a screenshot, a person, another animal, " +
                  "scenery only).\n" +
                  "  UNSAFE — image contains sexual, violent, gory, or " +
                  "otherwise inappropriate content regardless of subject.",
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

    if (verdict.startsWith("DOG")) return { ok: true };
    if (verdict.startsWith("UNSAFE")) {
      return { ok: false, reason: "Image flagged as inappropriate." };
    }
    if (verdict.startsWith("NOT_DOG")) {
      return { ok: false, reason: "No dog detected in photo." };
    }
    // Unparseable — fail closed.
    console.warn(
      "[dog-photo-classifier] unexpected verdict, failing closed:",
      verdict
    );
    return { ok: false, reason: "Photo check failed. Try a clearer photo." };
  } catch (err) {
    // Abort (timeout) lands here too — fail closed like any other error.
    console.error(
      "[dog-photo-classifier] OpenAI error — failing closed:",
      err
    );
    return {
      ok: false,
      reason: "Photo check is temporarily unavailable. Try again later.",
    };
  } finally {
    clearTimeout(timer);
  }
}
