-- ============================================================================
-- Health reports fixes + per-SIGHTING health tag.
--
-- 1) get_health_reports_admin listed the dog name with COALESCE(d.names[1],'')
--    but dogs.names is JSONB, so [1] yields jsonb and the COALESCE with a
--    text '' raised a runtime type error — the admin list never loaded.
--    The first name as text is d.names->>0.
-- 2) Health is per-sighting (a dog can be fine at one sighting and hurt at
--    another), so the flag lives on the sighting, not the dog. A health
--    report links to the reporter's latest sighting of that dog and tags it;
--    the tag clears when no unresolved report references that sighting.
-- Idempotent.
-- ============================================================================

ALTER TABLE public.sightings
  ADD COLUMN IF NOT EXISTS health_flag BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.health_reports
  ADD COLUMN IF NOT EXISTS sighting_id UUID
    REFERENCES public.sightings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS health_reports_sighting_id_idx
  ON public.health_reports (sighting_id);

-- ---------------------------------------------------------------------------
-- submit_health_report: insert + tag a sighting. Prefer the reporter's most
-- recent sighting of the dog; fall back to the dog's most recent sighting.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_health_report(
  p_dog_id UUID,
  p_body   TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_trimmed    TEXT;
  v_id         UUID;
  v_sighting_id UUID;
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

  -- The sighting this report is about: reporter's latest of this dog, else
  -- the dog's latest sighting overall.
  SELECT id INTO v_sighting_id
    FROM public.sightings
   WHERE dog_id = p_dog_id AND user_id = v_user_id
   ORDER BY timestamp DESC
   LIMIT 1;
  IF v_sighting_id IS NULL THEN
    SELECT id INTO v_sighting_id
      FROM public.sightings
     WHERE dog_id = p_dog_id
     ORDER BY timestamp DESC
     LIMIT 1;
  END IF;

  INSERT INTO public.health_reports (dog_id, reporter_id, body, sighting_id)
  VALUES (p_dog_id, v_user_id, v_trimmed, v_sighting_id)
  RETURNING id INTO v_id;

  IF v_sighting_id IS NOT NULL THEN
    UPDATE public.sightings SET health_flag = true WHERE id = v_sighting_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_health_report(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_health_reports_admin: fix the dog name extraction (JSONB ->> 0).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- update_health_report_status: recompute the linked sighting's health_flag
-- after a status change (cleared once no unresolved report references it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_health_report_status(
  p_id         UUID,
  p_status     TEXT,
  p_admin_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sighting_id UUID;
  v_found       BOOLEAN := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_status NOT IN ('new', 'reviewed', 'resolved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_status');
  END IF;

  UPDATE public.health_reports
     SET status     = p_status,
         admin_note = COALESCE(p_admin_note, admin_note),
         updated_at = now()
   WHERE id = p_id
  RETURNING sighting_id INTO v_sighting_id;

  GET DIAGNOSTICS v_found = ROW_COUNT;
  IF NOT v_found THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_sighting_id IS NOT NULL THEN
    UPDATE public.sightings
       SET health_flag = EXISTS (
         SELECT 1 FROM public.health_reports
          WHERE sighting_id = v_sighting_id AND status <> 'resolved'
       )
     WHERE id = v_sighting_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_health_report_status(UUID, TEXT, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- get_dog_sightings: expose health_flag so the dog's sighting log can show
-- a health tag on the specific sightings that were flagged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dog_sightings(
    p_dog_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    dog_id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    "character" public.dog_character,
    size INTEGER,
    gender public.dog_gender,
    age public.dog_age,
    notes TEXT,
    image_url TEXT,
    ear_tag_image_url TEXT,
    "timestamp" TIMESTAMPTZ,
    nickname TEXT,
    is_mine BOOLEAN,
    health_flag BOOLEAN
) AS $$
    SELECT s.id, s.dog_id, s.latitude, s.longitude,
           s.character, s.size, s.gender, s.age, s.notes,
           s.image_url, s.ear_tag_image_url, s.timestamp,
           p.nickname,
           (s.user_id = auth.uid()) AS is_mine,
           s.health_flag
    FROM public.sightings s
    LEFT JOIN public.profiles p ON p.id = s.user_id
    WHERE s.dog_id = p_dog_id
    ORDER BY s.timestamp DESC
    LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.get_dog_sightings(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
