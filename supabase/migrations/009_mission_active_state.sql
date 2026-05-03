-- ============================================================================
-- Mission v2: active-mission state + escalating bonus.
--
-- Mechanic:
--   1. User starts a mission for one raion at a time.
--   2. Each freshly spotted dog whose pin is inside the polygon awards
--      escalating XP: bonus = LEAST(distinct_count + 1, 10).
--      Dogs 1..10 grant 1..10 XP; dogs 11..20 plateau at 10 XP each.
--   3. Daily cap: at most 20 mission-bonus dogs counted per calendar day.
--   4. After 20 distinct dogs, mission is "passed" → flat +50 XP completion
--      bonus, mission slot is freed.
--
-- Trust model: the polygon test runs client-side; the server only
-- guarantees the user has a real sighting of each credited dog
-- (mission_dog_credits PK + sightings membership check) and enforces the
-- daily cap atomically. A bored cheater can mark dogs they spotted
-- elsewhere as in-mission, but XP is bounded per day so the impact is
-- self-limiting.
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS active_mission_slug TEXT
        REFERENCES public.mission_districts(slug),
    ADD COLUMN IF NOT EXISTS active_mission_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS active_mission_distinct_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_mission_awards_today INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_mission_award_date DATE;

-- Per-(user, mission run, dog) credit ledger. Composite PK = idempotent
-- replay protection: even if the client double-fires award_mission_progress
-- for the same dog in the same active run, only the first counts.
CREATE TABLE IF NOT EXISTS public.mission_dog_credits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    district_slug TEXT NOT NULL REFERENCES public.mission_districts(slug),
    started_at TIMESTAMPTZ NOT NULL,
    dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
    awarded_xp INTEGER NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, district_slug, started_at, dog_id)
);

ALTER TABLE public.mission_dog_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mission_dog_credits_select_own ON public.mission_dog_credits;
CREATE POLICY mission_dog_credits_select_own
    ON public.mission_dog_credits
    FOR SELECT USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.mission_dog_credits FROM authenticated;
GRANT SELECT ON public.mission_dog_credits TO authenticated;

-- Allow the authenticated client to read its own active-mission columns.
-- (Self-only column-level grants on profiles were tightened in migration
-- 005; we add only the read paths the client actually needs.)
GRANT SELECT (
    active_mission_slug,
    active_mission_started_at,
    active_mission_distinct_count,
    active_mission_awards_today,
    active_mission_award_date
) ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- start_mission(p_slug)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_mission(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_completed BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.mission_districts WHERE slug = p_slug) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unknown_district');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.mission_completions
         WHERE user_id = v_user_id AND district_slug = p_slug
    ) INTO v_completed;
    IF v_completed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
    END IF;

    UPDATE public.profiles
       SET active_mission_slug = p_slug,
           active_mission_started_at = NOW(),
           active_mission_distinct_count = 0,
           active_mission_awards_today = 0,
           active_mission_award_date = NULL
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'slug', p_slug);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.start_mission(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- cancel_active_mission()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_active_mission()
RETURNS JSONB AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;
    UPDATE public.profiles
       SET active_mission_slug = NULL,
           active_mission_started_at = NULL,
           active_mission_distinct_count = 0,
           active_mission_awards_today = 0,
           active_mission_award_date = NULL
     WHERE id = v_user_id;
    RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_active_mission() TO authenticated;

-- ---------------------------------------------------------------------------
-- award_mission_progress(p_dog_id)
-- Called by the client after a sighting is created, IF that sighting's
-- dog falls inside the active mission's polygon (test runs client-side).
--
-- Returns one of:
--   { ok:true, awarded:N, progress:K, target:20, completed:false }
--   { ok:true, awarded:N, completed:true, completion_bonus:50, ... }
--   { ok:true, awarded:0, reason:'no_active_mission' | 'already_credited' | 'daily_cap_reached' }
--   { ok:false, error:'unauthorized' | 'not_sighted' }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_mission_progress(p_dog_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slug TEXT;
    v_started_at TIMESTAMPTZ;
    v_count INTEGER;
    v_today INTEGER;
    v_award_date DATE;
    v_bonus INTEGER;
    v_completed BOOLEAN := FALSE;
    v_completion_bonus INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    -- Lock the row to serialize concurrent awards (e.g. background sync replay).
    SELECT active_mission_slug,
           active_mission_started_at,
           active_mission_distinct_count,
           active_mission_awards_today,
           active_mission_award_date
      INTO v_slug, v_started_at, v_count, v_today, v_award_date
      FROM public.profiles
     WHERE id = v_user_id
     FOR UPDATE;

    IF v_slug IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0, 'reason', 'no_active_mission');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.sightings
         WHERE user_id = v_user_id AND dog_id = p_dog_id
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_sighted');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.mission_dog_credits
         WHERE user_id = v_user_id
           AND district_slug = v_slug
           AND started_at = v_started_at
           AND dog_id = p_dog_id
    ) THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0, 'reason', 'already_credited');
    END IF;

    -- Reset daily counter on new day
    IF v_award_date IS DISTINCT FROM CURRENT_DATE THEN
        v_today := 0;
    END IF;

    IF v_today >= 20 THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0, 'reason', 'daily_cap_reached');
    END IF;

    v_bonus := LEAST(v_count + 1, 10);

    INSERT INTO public.mission_dog_credits (
        user_id, district_slug, started_at, dog_id, awarded_xp
    ) VALUES (v_user_id, v_slug, v_started_at, p_dog_id, v_bonus);

    UPDATE public.profiles
       SET active_mission_distinct_count = active_mission_distinct_count + 1,
           active_mission_awards_today   = v_today + 1,
           active_mission_award_date     = CURRENT_DATE,
           quest_bonus_total             = COALESCE(quest_bonus_total, 0) + v_bonus
     WHERE id = v_user_id;

    IF v_count + 1 >= 20 THEN
        v_completed := TRUE;
        v_completion_bonus := 50;

        INSERT INTO public.mission_completions (user_id, district_slug, dogs_at_completion)
            VALUES (v_user_id, v_slug, v_count + 1)
        ON CONFLICT (user_id, district_slug) DO NOTHING;

        UPDATE public.profiles
           SET active_mission_slug = NULL,
               active_mission_started_at = NULL,
               active_mission_distinct_count = 0,
               active_mission_awards_today = 0,
               active_mission_award_date = NULL,
               quest_bonus_total = COALESCE(quest_bonus_total, 0) + v_completion_bonus
         WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'awarded', v_bonus,
        'progress', v_count + 1,
        'target', 20,
        'completed', v_completed,
        'completion_bonus', v_completion_bonus
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.award_mission_progress(UUID) TO authenticated;
