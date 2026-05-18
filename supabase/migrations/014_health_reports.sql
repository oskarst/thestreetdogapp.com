-- ============================================================================
-- Health reports — users flag dogs that need vet attention.
--
-- A health_report belongs to (dog, reporter, body). Reporters create them
-- from /dog/{id}/report-health. Admins triage in /admin/health-reports.
-- No external notifications — admin reviews manually.
--
-- Lockdown style mirrors migration 005:
--   - INSERT goes through submit_health_report() RPC so we control body
--     length + bind reporter_id = auth.uid() server-side.
--   - SELECT is admin-only; users can't read each other's reports or
--     enumerate the table.
--   - UPDATE (status) is admin-only via update_health_report_status().
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.health_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id      UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'reviewed', 'resolved')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_reports_dog_id_idx
  ON public.health_reports (dog_id);
CREATE INDEX IF NOT EXISTS health_reports_status_created_idx
  ON public.health_reports (status, created_at DESC);

ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

-- No direct SELECT/INSERT/UPDATE policies for the authenticated role.
-- Everything flows through the RPCs below so we control the surface area.

-- ---------------------------------------------------------------------------
-- submit_health_report(p_dog_id, p_body)
--   → { ok: true, id: uuid } | { ok: false, error: text }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_health_report(
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

  INSERT INTO public.health_reports (dog_id, reporter_id, body)
  VALUES (p_dog_id, v_user_id, v_trimmed)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_health_report(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_health_reports_admin(p_status text default null)
--   Admin-only listing. Returns the report with the reporter nickname and
--   the dog's primary name + ear tag for context. Filter by status if
--   supplied.
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
    COALESCE(d.names[1], '') AS dog_name,
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
-- update_health_report_status(p_id, p_status, p_admin_note)
--   Admin-only status / note update.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_health_report_status(
  p_id         UUID,
  p_status     TEXT,
  p_admin_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
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
   WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_health_report_status(UUID, TEXT, TEXT)
  TO authenticated;
