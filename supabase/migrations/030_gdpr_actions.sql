-- ============================================================================
-- GDPR actions exposed on the account screen:
--
--   soft_delete_my_dog_data()  - right to erasure (reversible / soft)
--   export_my_data()           - right to data portability
--
-- Both act only on the caller's own rows (auth.uid()); SECURITY DEFINER is
-- used so the soft-delete can stamp dogs/sightings past the normal RLS write
-- policies in one atomic call.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Erasure (soft): stamp the caller's sightings deleted, and soft-delete dogs
-- they pioneered *only when no other user still has a live sighting of them*,
-- so a shared community dog isn't erased just because one contributor leaves.
-- Soft-deleted rows drop out of every score and public view (migration 027).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_my_dog_data()
RETURNS JSONB AS $$
DECLARE
    v_uid        UUID := auth.uid();
    v_sightings  INTEGER := 0;
    v_dogs       INTEGER := 0;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    UPDATE public.sightings
       SET deleted_at = NOW()
     WHERE user_id = v_uid
       AND deleted_at IS NULL;
    GET DIAGNOSTICS v_sightings = ROW_COUNT;

    UPDATE public.dogs d
       SET deleted_at = NOW()
     WHERE d.first_registered_by_id = v_uid
       AND d.deleted_at IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM public.sightings s2
            WHERE s2.dog_id = d.id
              AND s2.user_id <> v_uid
              AND s2.deleted_at IS NULL
       );
    GET DIAGNOSTICS v_dogs = ROW_COUNT;

    RETURN jsonb_build_object(
        'ok', true,
        'dogs_deleted', v_dogs,
        'sightings_deleted', v_sightings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.soft_delete_my_dog_data() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.soft_delete_my_dog_data() TO authenticated;


-- ---------------------------------------------------------------------------
-- Portability: a single JSON document of everything tied to the caller —
-- profile basics, the dogs they registered, and their sightings. The account
-- screen offers it as a downloadable file.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS JSONB AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'profile', (
            SELECT jsonb_build_object(
                'id', p.id,
                'nickname', p.nickname,
                'created_at', p.created_at
            )
            FROM public.profiles p WHERE p.id = v_uid
        ),
        'dogs', (
            SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
              FROM public.dogs d
             WHERE d.first_registered_by_id = v_uid
        ),
        'sightings', (
            SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
              FROM public.sightings s
             WHERE s.user_id = v_uid
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

NOTIFY pgrst, 'reload schema';
