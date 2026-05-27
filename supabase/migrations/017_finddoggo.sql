-- ============================================================================
-- Find Doggo missions
-- ----------------------------------------------------------------------------
-- A second mission type alongside district raions: the server picks one
-- random tagged dog seen in the last 7 days, ideally within 3 km of the
-- user's current location (city-wide fallback if no nearby candidate), and
-- the user has to log a fresh sighting of that exact dog to complete it.
--
-- Coexists with the existing district mission (separate active_* columns).
-- Completion bonus: +100 XP via profiles.quest_bonus_total.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS active_finddoggo_dog_id     UUID
        REFERENCES public.dogs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS active_finddoggo_started_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.finddoggo_completions (
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id       UUID        NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    gave_up      BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, dog_id, started_at)
);

ALTER TABLE public.finddoggo_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finddoggo_completions_select_own ON public.finddoggo_completions;
CREATE POLICY finddoggo_completions_select_own
    ON public.finddoggo_completions
    FOR SELECT
    USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.finddoggo_completions FROM authenticated;
GRANT SELECT ON public.finddoggo_completions TO authenticated;

-- Partial index keeps the candidate scan cheap: tagged dogs only, ordered by
-- recency. The pick-target query reads at most ~hundreds of rows under
-- realistic Tbilisi load.
CREATE INDEX IF NOT EXISTS idx_dogs_eartag_recent
    ON public.dogs (last_sighting_date DESC)
    WHERE ear_tag_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- start_finddoggo: pick a target and set it as active
-- ---------------------------------------------------------------------------
-- Picks a random tagged dog sighted in the last 7 days, preferring within
-- 3 km of (p_lat, p_lng) and excluding dogs the caller has already attempted
-- (completed or gave_up). Falls back to city-wide if the nearby pool is
-- empty. Refuses to start if a target is already active.
--
-- Returns: { ok: bool, dog_id?: uuid, scope?: 'nearby'|'city', error?: text }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_finddoggo(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_existing  UUID;
    v_target_id UUID;
    v_scope     TEXT := 'nearby';
    -- 3km bounding box: ~0.027 deg latitude, ~0.034 deg longitude at 41.7°N.
    v_lat_pad CONSTANT DOUBLE PRECISION := 0.027;
    v_lng_pad CONSTANT DOUBLE PRECISION := 0.034;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT active_finddoggo_dog_id INTO v_existing
      FROM public.profiles
     WHERE id = v_user_id;
    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', true, 'dog_id', v_existing, 'scope', 'existing'
        );
    END IF;

    -- Primary pool: 3km bbox + haversine refine.
    -- earthdistance / cube extensions aren't enabled, so the haversine is
    -- inlined. Bbox prefilter keeps the row count tiny before the math runs.
    SELECT d.id INTO v_target_id
      FROM public.dogs d
     WHERE d.ear_tag_id IS NOT NULL
       AND d.last_sighting_date >= NOW() - INTERVAL '7 days'
       AND d.last_latitude  BETWEEN p_lat - v_lat_pad AND p_lat + v_lat_pad
       AND d.last_longitude BETWEEN p_lng - v_lng_pad AND p_lng + v_lng_pad
       AND 6371000 * 2 * asin(sqrt(
              sin(radians((d.last_latitude  - p_lat) / 2)) ^ 2
            + cos(radians(p_lat)) * cos(radians(d.last_latitude))
            * sin(radians((d.last_longitude - p_lng) / 2)) ^ 2
          )) <= 3000
       AND NOT EXISTS (
           SELECT 1 FROM public.finddoggo_completions c
            WHERE c.user_id = v_user_id AND c.dog_id = d.id
       )
     ORDER BY random()
     LIMIT 1;

    -- Fallback: any tagged dog sighted in the last 7 days, anywhere.
    IF v_target_id IS NULL THEN
        v_scope := 'city';
        SELECT d.id INTO v_target_id
          FROM public.dogs d
         WHERE d.ear_tag_id IS NOT NULL
           AND d.last_sighting_date >= NOW() - INTERVAL '7 days'
           AND NOT EXISTS (
               SELECT 1 FROM public.finddoggo_completions c
                WHERE c.user_id = v_user_id AND c.dog_id = d.id
           )
         ORDER BY random()
         LIMIT 1;
    END IF;

    IF v_target_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_candidates');
    END IF;

    UPDATE public.profiles
       SET active_finddoggo_dog_id     = v_target_id,
           active_finddoggo_started_at = NOW()
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'dog_id', v_target_id, 'scope', v_scope);
END;
$$;

REVOKE ALL ON FUNCTION public.start_finddoggo(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.start_finddoggo(DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- ---------------------------------------------------------------------------
-- give_up_finddoggo: clear active state, record in history
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.give_up_finddoggo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_dog_id    UUID;
    v_started   TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT active_finddoggo_dog_id, active_finddoggo_started_at
      INTO v_dog_id, v_started
      FROM public.profiles
     WHERE id = v_user_id;

    IF v_dog_id IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'cleared', false);
    END IF;

    INSERT INTO public.finddoggo_completions
        (user_id, dog_id, started_at, gave_up)
    VALUES
        (v_user_id, v_dog_id, COALESCE(v_started, NOW()), TRUE)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
       SET active_finddoggo_dog_id     = NULL,
           active_finddoggo_started_at = NULL
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'cleared', true);
END;
$$;

REVOKE ALL ON FUNCTION public.give_up_finddoggo() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.give_up_finddoggo() TO authenticated;

-- ---------------------------------------------------------------------------
-- complete_finddoggo: called from the sighting POST handler when a new
-- sighting matches the user's active Find Doggo target. Idempotent.
-- ---------------------------------------------------------------------------
-- Returns: { ok: bool, awarded: int, dog_id?: uuid }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_finddoggo(p_dog_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_active    UUID;
    v_started   TIMESTAMPTZ;
    v_bonus CONSTANT INTEGER := 100;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT active_finddoggo_dog_id, active_finddoggo_started_at
      INTO v_active, v_started
      FROM public.profiles
     WHERE id = v_user_id;

    -- Not active, or active target is a different dog: no-op.
    IF v_active IS NULL OR v_active <> p_dog_id THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0);
    END IF;

    INSERT INTO public.finddoggo_completions
        (user_id, dog_id, started_at, completed_at, gave_up)
    VALUES
        (v_user_id, p_dog_id, COALESCE(v_started, NOW()), NOW(), FALSE)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
       SET active_finddoggo_dog_id     = NULL,
           active_finddoggo_started_at = NULL,
           quest_bonus_total           = COALESCE(quest_bonus_total, 0) + v_bonus
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'awarded', v_bonus, 'dog_id', p_dog_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_finddoggo(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.complete_finddoggo(UUID) TO authenticated;
