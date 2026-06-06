import OpenAI from "openai";

interface ModerationResult {
  ok: boolean;
  /** Short reason why the text was rejected, when ok=false. */
  reason?: string;
}

// Module-level client so the underlying HTTP keep-alive agent is reused
// across invocations instead of reconnecting per request. apiKey is read
// here once; the per-call guard below still handles a missing key.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Multilingual profanity / offensive-content check for dog names.
 * Covers English, Russian, Georgian. Uses gpt-5-nano (cheapest OpenAI
 * chat model, matches the project's existing OCR pattern).
 *
 * Fails CLOSED on any API/network error — i.e. blocks the name with a
 * "Try again" reason. The previous fail-open behavior let an attacker
 * deliberately exhaust the OpenAI key and then submit slurs unchecked.
 */
export async function checkNameForProfanity(
  rawName: string
): Promise<ModerationResult> {
  const name = rawName.trim();
  if (!name) return { ok: false, reason: "empty" };
  if (name.length > 20) return { ok: false, reason: "too long" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No key configured — block to fail safe; log so we notice in dev.
    console.warn("[moderation] OPENAI_API_KEY not set — failing closed");
    return {
      ok: false,
      reason: "Name moderation is temporarily unavailable. Try again later.",
    };
  }

  try {
    const response = await client.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a content filter for dog names submitted by users. " +
                "The name may be in English, Russian, or Georgian (including " +
                "transliterations). Reject the name only if it contains " +
                "profanity, slurs, sexual content, or threats. Be strict but " +
                "do not reject merely uncommon, foreign, or playful names. " +
                "Reply with exactly one word: 'OK' if safe, or 'BLOCKED' if not.",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: name }],
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
    if (verdict.startsWith("BLOCKED")) {
      return {
        ok: false,
        reason: "Name flagged as inappropriate",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[moderation] OpenAI error — failing closed:", err);
    return {
      ok: false,
      reason: "Name moderation is temporarily unavailable. Try again later.",
    };
  }
}
