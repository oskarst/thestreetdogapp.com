-- ============================================================================
-- "Report bad data" on a dog page.
--
-- Files a row in the existing public.reports table with report_type 'issue'
-- (wrong / bad data), so it surfaces in the admin reports queue alongside
-- other reports. Goes through an RPC — same posture as submit_health_report —
-- so the body is validated and the insert isn't exposed to the client.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_data_report(
    p_dog_id UUID,
    p_body   TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trimmed TEXT;
    v_id      UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    v_trimmed := btrim(COALESCE(p_body, ''));
    IF length(v_trimmed) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'body_too_short');
    END IF;
    IF length(v_trimmed) > 2000 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'body_too_long');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.dogs WHERE id = p_dog_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dog_not_found');
    END IF;

    INSERT INTO public.reports (user_id, dog_id, report_type, message)
    VALUES (v_user_id, p_dog_id, 'issue', v_trimmed)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_data_report(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
