-- ============================================================================
-- Moderation incidents log.
--
-- When the image-moderation classifier can't run (OpenAI key missing, timeout,
-- or API error) we now fail OPEN — the upload is allowed through instead of
-- being blocked with "moderation unavailable". Every such pass-through is
-- recorded here so an admin can review what got in during the outage.
--
-- Written only by the server (service role); readable by admins.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_incidents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    stage      TEXT NOT NULL,        -- e.g. 'dog-photo-check', 'ear-tag-check'
    detail     TEXT,                 -- reason code from moderateImage
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_incidents_created_at
    ON public.moderation_incidents (created_at DESC);

ALTER TABLE public.moderation_incidents ENABLE ROW LEVEL SECURITY;

-- Admins can read; inserts go through the service role (which bypasses RLS),
-- so no INSERT policy for authenticated users.
DROP POLICY IF EXISTS moderation_incidents_select_admin ON public.moderation_incidents;
CREATE POLICY moderation_incidents_select_admin
    ON public.moderation_incidents
    FOR SELECT TO authenticated
    USING (public.is_admin());

NOTIFY pgrst, 'reload schema';
