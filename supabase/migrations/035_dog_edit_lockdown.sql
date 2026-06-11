-- ============================================================================
-- Lock down dog edits (audit finding #1).
--
-- Before: ANY non-banned user could UPDATE ANY dog row directly (overwrite
-- ear_tag_id, wipe images, etc.). Now:
--   * Direct UPDATEs are limited to the dog's owner (first_registered_by_id)
--     or an admin (RLS).
--   * A user's only sanctioned manual edit of *their own* dog is changing the
--     ear tag id or soft-deleting it, via the two owner-only RPCs below.
--
-- Server routes that legitimately write other users' dogs (re-sighting bumps,
-- community naming) go through the service-role client, which bypasses RLS and
-- enforces its own rules — so this tightening doesn't break them.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Owner-only: change the ear tag id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_dog_ear_tag(
    p_dog_id      UUID,
    p_ear_tag_id  TEXT
) RETURNS JSONB AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_owner UUID;
    v_tag   TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT first_registered_by_id INTO v_owner
      FROM public.dogs WHERE id = p_dog_id AND deleted_at IS NULL;
    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dog_not_found');
    END IF;
    IF v_owner IS DISTINCT FROM v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
    END IF;

    v_tag := NULLIF(btrim(COALESCE(p_ear_tag_id, '')), '');

    -- ear_tag_id is UNIQUE; report a friendly conflict instead of a raw error.
    IF v_tag IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.dogs WHERE ear_tag_id = v_tag AND id <> p_dog_id
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'tag_taken');
    END IF;

    UPDATE public.dogs SET ear_tag_id = v_tag WHERE id = p_dog_id;
    RETURN jsonb_build_object('ok', true, 'ear_tag_id', v_tag);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.update_my_dog_ear_tag(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_my_dog_ear_tag(UUID, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2) Owner-only: soft-delete the dog
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_dog(p_dog_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_owner UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT first_registered_by_id INTO v_owner
      FROM public.dogs WHERE id = p_dog_id AND deleted_at IS NULL;
    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dog_not_found');
    END IF;
    IF v_owner IS DISTINCT FROM v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
    END IF;

    UPDATE public.dogs SET deleted_at = NOW() WHERE id = p_dog_id;
    RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.soft_delete_dog(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.soft_delete_dog(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3) Tighten the dogs UPDATE policy: owner or admin only (still not banned).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS dogs_update ON public.dogs;
CREATE POLICY dogs_update ON public.dogs
    FOR UPDATE TO authenticated
    USING (
        (first_registered_by_id = auth.uid() OR public.is_admin())
        AND NOT public.is_banned()
    )
    WITH CHECK (
        (first_registered_by_id = auth.uid() OR public.is_admin())
        AND NOT public.is_banned()
    );

NOTIFY pgrst, 'reload schema';
