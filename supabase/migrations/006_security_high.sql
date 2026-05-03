-- ============================================================================
-- HIGH-severity audit fixes:
--
-- 1. dogs UPDATE: column-level grants. Currently any non-banned user can
--    UPDATE any column on any dog row, which lets them forge
--    first_registered_by_id (claim +10 score + naming rights for someone
--    else's dog). Restrict to the columns the app legitimately mutates from
--    the authenticated client.
-- 2. Atomic, self-resetting OCR counter (try_increment_ocr_usage) — closes
--    the read-then-write race + off-by-one.
-- 3. Atomic name-attempt counter (try_increment_name_attempts) — caps
--    /api/dogs/[id]/name calls per user per day so the OpenAI moderation
--    key can't be exhausted by an attacker.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. dogs: column-level UPDATE grants
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON public.dogs FROM authenticated;
GRANT UPDATE (
    images,
    last_latitude,
    last_longitude,
    last_sighting_date,
    "character",
    size,
    gender,
    age,
    ear_tag_image,
    names
) ON public.dogs TO authenticated;
-- Withheld from authenticated: id, ear_tag_id, first_registered_by_id,
-- created_at, updated_at. The first_registered_by_id is the security-
-- sensitive one (controls naming permission + +10 score). ear_tag_id is
-- locked once set so users can't claim someone else's tag.

-- ---------------------------------------------------------------------------
-- 2. Atomic, self-resetting OCR counter
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS ocr_usage_reset_date DATE;

-- Atomic increment with a per-day auto-reset. Returns the new count, or
-- NULL when the limit has been reached.
CREATE OR REPLACE FUNCTION public.try_increment_ocr_usage(p_max INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
    v_today DATE := CURRENT_DATE;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    -- Reset the counter if the last increment was on a different day.
    UPDATE public.profiles
       SET ocr_usage_count = 0,
           ocr_usage_reset_date = v_today
     WHERE id = v_uid
       AND (ocr_usage_reset_date IS DISTINCT FROM v_today);

    -- Single-statement conditional increment — atomic at the row level.
    UPDATE public.profiles
       SET ocr_usage_count = ocr_usage_count + 1
     WHERE id = v_uid
       AND ocr_usage_count < p_max
    RETURNING ocr_usage_count INTO v_new_count;

    -- v_new_count is NULL when the row's ocr_usage_count was already >= p_max.
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.try_increment_ocr_usage(INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Atomic, self-resetting name-attempt counter
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS name_attempts_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS name_attempts_reset_date DATE;

CREATE OR REPLACE FUNCTION public.try_increment_name_attempts(p_max INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
    v_today DATE := CURRENT_DATE;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.profiles
       SET name_attempts_count = 0,
           name_attempts_reset_date = v_today
     WHERE id = v_uid
       AND (name_attempts_reset_date IS DISTINCT FROM v_today);

    UPDATE public.profiles
       SET name_attempts_count = name_attempts_count + 1
     WHERE id = v_uid
       AND name_attempts_count < p_max
    RETURNING name_attempts_count INTO v_new_count;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.try_increment_name_attempts(INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Idempotency lookup for /api/sightings replay protection
-- ---------------------------------------------------------------------------
-- The route used .from("sightings").select("dog_id").eq("user_id", auth.uid())
-- to find a previous insert by client_uuid. After lockdown 005, user_id is
-- no longer SELECT-able from authenticated. Use a SECURITY DEFINER lookup.

CREATE OR REPLACE FUNCTION public.find_my_sighting_by_client_uuid(
    p_client_uuid UUID
)
RETURNS UUID AS $$
    SELECT dog_id FROM public.sightings
     WHERE user_id = auth.uid()
       AND client_uuid = p_client_uuid
     LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.find_my_sighting_by_client_uuid(UUID) TO authenticated;
