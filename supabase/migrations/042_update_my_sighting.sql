-- ============================================================================
-- Let a user edit their OWN sighting's info.
--
-- RLS only lets admins UPDATE sightings, so self-edit goes through this
-- SECURITY DEFINER RPC. It edits only descriptive fields (character, size,
-- gender, age, notes) of a row the caller owns and hasn't soft-deleted.
-- Location, timestamp, images, dog_id and health_flag stay immutable here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_my_sighting(
    p_id        UUID,
    p_character TEXT,
    p_size      INTEGER,
    p_gender    TEXT,
    p_age       TEXT,
    p_notes     TEXT
) RETURNS JSONB AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_notes TEXT;
    v_rows  INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_character NOT IN
       ('friendly','very_friendly','indifferent','sleeping','afraid','aggressive') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_character');
    END IF;
    IF p_gender NOT IN ('male','female','unknown') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_gender');
    END IF;
    IF p_age NOT IN ('puppy','young','adult','old') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_age');
    END IF;
    IF p_size IS NULL OR p_size < 1 OR p_size > 10 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_size');
    END IF;

    v_notes := btrim(COALESCE(p_notes, ''));
    IF length(v_notes) > 2000 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'notes_too_long');
    END IF;

    UPDATE public.sightings
       SET character = p_character::public.dog_character,
           size      = p_size,
           gender    = p_gender::public.dog_gender,
           age       = p_age::public.dog_age,
           notes     = NULLIF(v_notes, '')
     WHERE id = p_id
       AND user_id = v_uid
       AND deleted_at IS NULL;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.update_my_sighting(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_sighting(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
