-- ============================================================================
-- get_health_reports_admin: add reporter email + the linked sighting's
-- location so admins can email the volunteer and open the spot on a map.
-- DROP first (return type changes).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_health_reports_admin(TEXT);

CREATE FUNCTION public.get_health_reports_admin(
  p_status TEXT DEFAULT NULL
) RETURNS TABLE (
  id             UUID,
  dog_id         UUID,
  dog_name       TEXT,
  dog_ear_tag    TEXT,
  reporter_id    UUID,
  reporter_name  TEXT,
  reporter_email TEXT,
  body           TEXT,
  status         TEXT,
  admin_note     TEXT,
  created_at     TIMESTAMPTZ,
  sighting_id    UUID,
  sighting_lat   DOUBLE PRECISION,
  sighting_lng   DOUBLE PRECISION
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
    p.email AS reporter_email,
    hr.body,
    hr.status,
    hr.admin_note,
    hr.created_at,
    hr.sighting_id,
    s.latitude AS sighting_lat,
    s.longitude AS sighting_lng
  FROM public.health_reports hr
  LEFT JOIN public.dogs d ON d.id = hr.dog_id
  LEFT JOIN public.profiles p ON p.id = hr.reporter_id
  LEFT JOIN public.sightings s ON s.id = hr.sighting_id
  WHERE p_status IS NULL OR hr.status = p_status
  ORDER BY
    CASE hr.status WHEN 'new' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,
    hr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_health_reports_admin(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
