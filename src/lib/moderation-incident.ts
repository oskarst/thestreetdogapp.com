import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Record a moderation pass-through: the image classifier couldn't run, so the
 * upload was let through (fail-open). Best-effort — a logging failure must
 * never block the upload it's logging. Uses the service role so the insert
 * isn't gated by RLS.
 */
export async function logModerationIncident(input: {
  userId?: string | null;
  stage: string;
  detail?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("moderation_incidents").insert({
      user_id: input.userId ?? null,
      stage: input.stage,
      detail: input.detail ?? null,
    });
    console.warn(
      `[moderation-incident] passed through (${input.stage}): ${input.detail ?? "unknown"}`
    );
  } catch (err) {
    console.error("[moderation-incident] failed to log:", err);
  }
}
