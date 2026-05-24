import OpenAI from "openai";

interface ClassifyResult {
  ok: boolean;
  /** Short reason why the image was rejected, when ok=false. */
  reason?: string;
}

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

  let dataUrl: string;
  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    dataUrl = `data:${file.type};base64,${base64}`;
  } catch (err) {
    console.error("[dog-photo-classifier] failed to read file:", err);
    return { ok: false, reason: "Image could not be read." };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.responses.create({
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
    });

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
    console.error(
      "[dog-photo-classifier] OpenAI error — failing closed:",
      err
    );
    return {
      ok: false,
      reason: "Photo check is temporarily unavailable. Try again later.",
    };
  }
}
