-- ============================================================================
-- Fix: get_health_reports_admin raised "column reference \"id\" is ambiguous".
--
-- The function's RETURNS TABLE(id, dog_id, ...) output columns are also
-- in scope as PL/pgSQL variables, so they collide with the id/created_at/etc.
-- columns of the joined tables. Add `#variable_conflict use_column` so the
-- parser resolves ambiguous names to the table column. Output column names
-- are unchanged (the admin page reads them by name).
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
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'admin'
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
