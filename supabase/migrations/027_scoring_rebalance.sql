-- ============================================================================
-- Scoring rebalance: ~3.3x bump so a brand-new dog (Pioneer) is worth 100 XP.
--
-- Players asked for bigger, more satisfying numbers. Anchored on new dog = 100
-- (was 30), every value scales ~3.3x and rounds to clean multiples of 5 so the
-- relative balance is unchanged — only the magnitudes grow.
--
--   Pioneer (new tagged dog)      30  -> 100
--   Tracker (distinct tagged dog) 20  ->  65
--   Sighting (capped 5/dog/day)   10  ->  35
--   Ear-tag photo bonus            5  ->  15
--   Untagged welfare bonus         5  ->  15
--   Daily quest claim             15  ->  50
--   Mission per-dog grants  10/20/30/40/50 -> 35/65/100/135/165
--   Mission completion bonus     100  -> 350
--   Find-a-doggo completion      100  -> 350
--
-- Live-computed components (Pioneer/Tracker/Sighting/bonuses) rebalance
-- automatically because get_user_score recomputes them. The stored
-- quest_bonus_total accumulator (past daily claims + mission/finddoggo awards)
-- is a number on disk, so we multiply it by 10/3 once here to keep it on the
-- same new scale as everything else.
--
-- Also folds in the GDPR soft-delete filter (migration 026): deleted dogs and
-- sightings no longer count toward any score.
--
-- Idempotent — every function is CREATE OR REPLACE; the quest_bonus_total
-- rescale is the one non-idempotent step (guarded so a re-run is a no-op).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Scoring v6 (replaces v5 from migration 013) + soft-delete filter
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_score(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_new_dogs            INTEGER;
    v_unique_dogs         INTEGER;
    v_total_catches       INTEGER;
    v_capped_catches      INTEGER;
    v_ear_tag_count       INTEGER;
    v_no_tag_count        INTEGER;
    v_quest_bonus         INTEGER;
    v_total_score         INTEGER;
BEGIN
    -- Pioneer count: catalogued (ear-tagged) dogs you first registered.
    SELECT COUNT(*) INTO v_new_dogs
      FROM public.dogs
     WHERE first_registered_by_id = p_user_id
       AND ear_tag_id IS NOT NULL
       AND deleted_at IS NULL;

    -- Tracker count: distinct catalogued dogs you've sighted.
    SELECT COUNT(DISTINCT s.dog_id) INTO v_unique_dogs
      FROM public.sightings s
      JOIN public.dogs d ON d.id = s.dog_id
     WHERE s.user_id = p_user_id
       AND s.deleted_at IS NULL
       AND d.deleted_at IS NULL
       AND d.ear_tag_id IS NOT NULL;

    SELECT COUNT(*) INTO v_total_catches
      FROM public.sightings
     WHERE user_id = p_user_id
       AND deleted_at IS NULL;

    -- Soft cap: at most 5 sightings per (dog, day) count toward points.
    SELECT COALESCE(SUM(LEAST(daily_count, 5)), 0)::INTEGER INTO v_capped_catches
      FROM (
        SELECT COUNT(*) AS daily_count
          FROM public.sightings
         WHERE user_id = p_user_id
           AND deleted_at IS NULL
         GROUP BY dog_id, DATE(timestamp)
      ) per_day;

    -- Welfare bonus 1: every sighting with an ear-tag photo earns +15.
    SELECT COUNT(*) INTO v_ear_tag_count
      FROM public.sightings
     WHERE user_id = p_user_id
       AND deleted_at IS NULL
       AND ear_tag_image_url IS NOT NULL;

    -- Welfare bonus 2: every sighting of an *untagged* dog earns +15.
    SELECT COUNT(*) INTO v_no_tag_count
      FROM public.sightings s
      JOIN public.dogs d ON d.id = s.dog_id
     WHERE s.user_id = p_user_id
       AND s.deleted_at IS NULL
       AND d.deleted_at IS NULL
       AND d.ear_tag_id IS NULL;

    SELECT COALESCE(quest_bonus_total, 0) INTO v_quest_bonus
      FROM public.profiles
     WHERE id = p_user_id;

    v_total_score := (v_new_dogs       * 100)
                   + (v_unique_dogs    * 65)
                   + (v_capped_catches * 35)
                   + (v_ear_tag_count  * 15)
                   + (v_no_tag_count   * 15)
                   + v_quest_bonus;

    RETURN jsonb_build_object(
        'new_dogs',                v_new_dogs,
        'new_dogs_points',         v_new_dogs       * 100,
        'unique_dogs',             v_unique_dogs,
        'unique_dogs_points',      v_unique_dogs    * 65,
        'total_catches',           v_total_catches,
        'total_catches_points',    v_capped_catches * 35,
        'ear_tag_bonus_count',     v_ear_tag_count,
        'ear_tag_bonus_points',    v_ear_tag_count  * 15,
        'no_tag_bonus_count',      v_no_tag_count,
        'no_tag_bonus_points',     v_no_tag_count   * 15,
        'quest_bonus_points',      v_quest_bonus,
        'total_score',             v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- 2) Daily-quest claim: +15 -> +50 XP
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_quest()
RETURNS JSONB AS $$
DECLARE
    v_user_id        UUID;
    v_today          DATE := CURRENT_DATE;
    v_already        BOOLEAN;
    v_has_sighting   BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT (quest_last_claimed_date = v_today) INTO v_already
      FROM public.profiles
     WHERE id = v_user_id;
    IF v_already THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.sightings
         WHERE user_id = v_user_id
           AND deleted_at IS NULL
           AND DATE(timestamp) = v_today
    ) INTO v_has_sighting;
    IF NOT v_has_sighting THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_sighting_today');
    END IF;

    UPDATE public.profiles
       SET quest_bonus_total = quest_bonus_total + 50,
           quest_last_claimed_date = v_today
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'awarded', 50);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_daily_quest() TO authenticated;


-- ---------------------------------------------------------------------------
-- 3) Mission progress: per-dog grants 35/65/100/135/165, completion +350
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
    v_target CONSTANT INTEGER := 5;
    v_daily_cap CONSTANT INTEGER := 20;
    -- Escalating per-dog grants, ~3.3x the old 10/20/30/40/50 ladder.
    v_grants CONSTANT INTEGER[] := ARRAY[35, 65, 100, 135, 165];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

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
         WHERE user_id = v_user_id AND dog_id = p_dog_id AND deleted_at IS NULL
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

    IF v_award_date IS DISTINCT FROM CURRENT_DATE THEN
        v_today := 0;
    END IF;

    IF v_today >= v_daily_cap THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0, 'reason', 'daily_cap_reached');
    END IF;

    -- Escalating per-dog grants: 35, 65, 100, 135, 165 (clamped at the 5th).
    v_bonus := v_grants[LEAST(v_count + 1, v_target)];

    INSERT INTO public.mission_dog_credits (
        user_id, district_slug, started_at, dog_id, awarded_xp
    ) VALUES (v_user_id, v_slug, v_started_at, p_dog_id, v_bonus);

    UPDATE public.profiles
       SET active_mission_distinct_count = active_mission_distinct_count + 1,
           active_mission_awards_today   = v_today + 1,
           active_mission_award_date     = CURRENT_DATE,
           quest_bonus_total             = COALESCE(quest_bonus_total, 0) + v_bonus
     WHERE id = v_user_id;

    IF v_count + 1 >= v_target THEN
        v_completed := TRUE;
        v_completion_bonus := 350;

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
        'target', v_target,
        'completed', v_completed,
        'completion_bonus', v_completion_bonus
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.award_mission_progress(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 4) Find-a-doggo completion: +100 -> +350 XP
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_finddoggo(p_dog_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_active    UUID;
    v_started   TIMESTAMPTZ;
    v_bonus CONSTANT INTEGER := 350;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT active_finddoggo_dog_id, active_finddoggo_started_at
      INTO v_active, v_started
      FROM public.profiles
     WHERE id = v_user_id;

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


-- ---------------------------------------------------------------------------
-- 5) Dashboard RPC: same as migration 021, plus the soft-delete filter so
--    deleted dogs drop out of the dog grid and caught-ids.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_dashboard(p_limit INTEGER DEFAULT 60)
RETURNS JSONB AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_limit   INTEGER := LEAST(GREATEST(COALESCE(p_limit, 60), 1), 200);
    v_dogs    JSONB;
    v_favs    JSONB;
    v_caught  JSONB;
    v_score   JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id',                     d.id,
                'ear_tag_id',             d.ear_tag_id,
                'names',                  d.names,
                'images', CASE
                    WHEN d.images IS NOT NULL
                         AND jsonb_typeof(d.images) = 'array'
                         AND jsonb_array_length(d.images) > 0
                    THEN jsonb_build_array(d.images->0)
                    ELSE '[]'::jsonb
                END,
                'thumbnail',              d.thumbnail,
                'last_sighting_date',     d.last_sighting_date,
                'created_at',             d.created_at,
                'first_registered_by_id', d.first_registered_by_id,
                'is_first_found',         d.first_registered_by_id = v_uid
            )
            ORDER BY d.last_sighting_date DESC NULLS LAST
        ),
        '[]'::jsonb
    ) INTO v_dogs
    FROM (
        SELECT id, ear_tag_id, names, images, thumbnail,
               last_sighting_date, created_at, first_registered_by_id
        FROM public.dogs
        WHERE (status = 'approved' OR first_registered_by_id = v_uid)
          AND deleted_at IS NULL
        ORDER BY last_sighting_date DESC NULLS LAST
        LIMIT v_limit
    ) d;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_favs
      FROM public.favorites WHERE user_id = v_uid;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_caught
      FROM (
          SELECT DISTINCT ON (dog_id) dog_id, MAX(timestamp) AS last_seen
          FROM public.sightings
          WHERE user_id = v_uid
            AND deleted_at IS NULL
          GROUP BY dog_id
          ORDER BY dog_id, last_seen DESC
          LIMIT 1000
      ) c;

    v_score := public.get_user_score(v_uid);

    RETURN jsonb_build_object(
        'ok',                true,
        'dogs',              v_dogs,
        'favorite_ids',      v_favs,
        'caught_dog_ids',    v_caught,
        'score',             v_score,
        'dog_limit',         v_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_dashboard(INTEGER) TO authenticated;


-- ---------------------------------------------------------------------------
-- 6) One-time rescale of the stored quest_bonus_total accumulator (x10/3),
--    so past daily/mission/finddoggo awards sit on the new scale too.
--    Guarded by a marker row so a migration re-run doesn't double-apply.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._scoring_migrations (
    tag TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public._scoring_migrations WHERE tag = '027_quest_bonus_rescale') THEN
        UPDATE public.profiles
           SET quest_bonus_total = ROUND(COALESCE(quest_bonus_total, 0) * 10.0 / 3.0)
         WHERE COALESCE(quest_bonus_total, 0) <> 0;

        INSERT INTO public._scoring_migrations (tag) VALUES ('027_quest_bonus_rescale');
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
