-- ============================================================================
-- Let a user delete only THEIR OWN data for a single dog.
--
-- Soft-deletes (stamps deleted_at) the caller's sightings of one dog. Other
-- people's sightings and the dog itself are untouched, so a shared dog stays
-- visible. Mirrors the GDPR soft_delete_my_dog_data pattern, scoped to one dog.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_sightings_for_dog(p_dog_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_count INTEGER := 0;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    UPDATE public.sightings
       SET deleted_at = NOW()
     WHERE user_id = v_uid
       AND dog_id = p_dog_id
       AND deleted_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object('ok', true, 'deleted', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.delete_my_sightings_for_dog(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_my_sightings_for_dog(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
