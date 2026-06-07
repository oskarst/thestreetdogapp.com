import OpenAI from "openai";
import sharp from "sharp";

interface DogCheckResult {
  /** Whether a dog (or part of one) is visible in the photo. */
  hasDog: boolean;
}

// Module-level client so the underlying HTTP keep-alive agent is reused
// across invocations instead of reconnecting per request.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Hard ceiling on the OpenAI call so a slow/flaky endpoint fails fast
// instead of holding the lambda open. On timeout we fail OPEN (see below).
const OPENAI_TIMEOUT_MS = 6000;

/**
 * Detect whether a dog — or any part of a dog — is visible in an uploaded
 * photo. This is NOT a hard gate: a "no dog" result doesn't reject the
 * upload. The dog is still saved for the user but kept out of public views
 * and queued for an admin to approve or decline (see the sightings route).
 *
 * Explicit-content safety is handled separately by [[image-moderation]]
 * (omni-moderation), which DOES hard-block.
 *
 * Posture: fails OPEN — if the model errors, times out, or the key is
 * missing, we assume a dog IS present so our own hiccups never wrongly hide
 * a legitimate submission.
 */
export async function checkHasDog(file: File): Promise<DogCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[dog-presence-check] OPENAI_API_KEY not set — assuming dog");
    return { hasDog: true };
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
    // Can't read the image — assume a dog and let the upload proceed; the
    // server still has its own size/sharp guards.
    console.error("[dog-presence-check] failed to read file:", err);
    return { hasDog: true };
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
                  "logging app. Decide whether any dog, or any part of a " +
                  "dog, is visible anywhere in the image. Count it as a dog " +
                  "even if it is only partial (a paw, tail, ear, nose, leg), " +
                  "blurry, far away, in shadow, or in the background. Reply " +
                  "with EXACTLY one token, nothing else:\n" +
                  "  DOG — a dog or part of a dog is visible.\n" +
                  "  NO_DOG — there is clearly no dog anywhere in the image.",
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

    // Only a clear NO_DOG flags the photo for review. Anything else
    // (DOG, or an unparseable verdict) passes through as a dog.
    if (verdict.startsWith("NO_DOG")) {
      return { hasDog: false };
    }
    if (!verdict.startsWith("DOG")) {
      console.warn(
        "[dog-presence-check] unexpected verdict, assuming dog:",
        verdict
      );
    }
    return { hasDog: true };
  } catch (err) {
    // Abort (timeout) lands here too — fail OPEN.
    console.error("[dog-presence-check] OpenAI error — assuming dog:", err);
    return { hasDog: true };
  } finally {
    clearTimeout(timer);
  }
}
