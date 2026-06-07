-- ============================================================================
-- Definitive fix for "column reference \"id\" is ambiguous" in
-- get_health_reports_admin.
--
-- The admin-gate subquery used a bare `WHERE id = auth.uid()`, which is
-- ambiguous between profiles.id and the RETURNS TABLE output variable `id`.
-- Qualify every column reference (alias profiles AS pr) so it no longer
-- depends on the #variable_conflict directive. Output column names are
-- unchanged.
-- Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_health_reports_admin(
  p_status TEXT DEFAULT NULL
) RETURNS TABLE (
  id            UUID,
  dog_id        UUID,
  dog_name      TEXT,
  dog_ear_tag   TEXT,
  reporter_id   UUID,
  reporter_name TEXT,
  body          TEXT,
  status        TEXT,
  admin_note    TEXT,
  created_at    TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles pr
     WHERE pr.id = auth.uid() AND pr.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    hr.id,
    hr.dog_id,
    COALESCE(d.names->>0, '') AS dog_name,
    d.ear_tag_id AS dog_ear_tag,
    hr.reporter_id,
    p.nickname AS reporter_name,
    hr.body,
    hr.status,
    hr.admin_note,
    hr.created_at
  FROM public.health_reports hr
  LEFT JOIN public.dogs d ON d.id = hr.dog_id
  LEFT JOIN public.profiles p ON p.id = hr.reporter_id
  WHERE p_status IS NULL OR hr.status = p_status
  ORDER BY
    CASE hr.status WHEN 'new' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,
    hr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_health_reports_admin(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
