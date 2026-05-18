-- ============================================================================
-- Dashboard v5: easier-levels scoring + 5-dog missions + 1.25 km chunks.
--
-- Bundles three previously-separate migrations (013/014/015) so the whole
-- rebalance ships atomically. Order matters: scoring + claim_daily_quest
-- first, then award_mission_progress (target=5), then the new chunk grid.
--
-- After this runs:
--   - Pioneer ×30 · Tracker ×20 · Sighting ×10 (capped 5/dog/day)
--   - ear-tag photo +5 · untagged welfare +5 · daily quest claim +15
--   - Mission target: 5 distinct dogs · completion +100 XP · per-dog grants
--     10/20/30/40/50 · daily cap 20
--   - 316 chunks at 1.25 km cells (was 1285 chunks at 0.625 km)
--
-- Heads-up: this wipes in-flight mission state and clears mission_dog_credits
-- + mission_completions because chunk slugs change. Sighting/Tracker/Pioneer
-- points are read-computed (get_user_score) so existing accounts rebalance
-- immediately to the new totals.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Scoring v5 (replaces v4 from migration 012)
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
    -- Pioneer count: only catalogued (ear-tagged) dogs you first registered.
    SELECT COUNT(*) INTO v_new_dogs
      FROM public.dogs
     WHERE first_registered_by_id = p_user_id
       AND ear_tag_id IS NOT NULL;

    -- Tracker count: distinct catalogued dogs you've sighted.
    SELECT COUNT(DISTINCT s.dog_id) INTO v_unique_dogs
      FROM public.sightings s
      JOIN public.dogs d ON d.id = s.dog_id
     WHERE s.user_id = p_user_id
       AND d.ear_tag_id IS NOT NULL;

    SELECT COUNT(*) INTO v_total_catches
      FROM public.sightings
     WHERE user_id = p_user_id;

    -- Soft cap: at most 5 sightings per (dog, day) count toward points.
    SELECT COALESCE(SUM(LEAST(daily_count, 5)), 0)::INTEGER INTO v_capped_catches
      FROM (
        SELECT COUNT(*) AS daily_count
          FROM public.sightings
         WHERE user_id = p_user_id
         GROUP BY dog_id, DATE(timestamp)
      ) per_day;

    -- Welfare bonus 1: every sighting with an ear-tag photo earns +5.
    SELECT COUNT(*) INTO v_ear_tag_count
      FROM public.sightings
     WHERE user_id = p_user_id
       AND ear_tag_image_url IS NOT NULL;

    -- Welfare bonus 2: every sighting of an *untagged* dog earns +5.
    SELECT COUNT(*) INTO v_no_tag_count
      FROM public.sightings s
      JOIN public.dogs d ON d.id = s.dog_id
     WHERE s.user_id = p_user_id
       AND d.ear_tag_id IS NULL;

    SELECT COALESCE(quest_bonus_total, 0) INTO v_quest_bonus
      FROM public.profiles
     WHERE id = p_user_id;

    v_total_score := (v_new_dogs       * 30)
                   + (v_unique_dogs    * 20)
                   + (v_capped_catches * 10)
                   + (v_ear_tag_count  * 5)
                   + (v_no_tag_count   * 5)
                   + v_quest_bonus;

    RETURN jsonb_build_object(
        'new_dogs',                v_new_dogs,
        'new_dogs_points',         v_new_dogs       * 30,
        'unique_dogs',             v_unique_dogs,
        'unique_dogs_points',      v_unique_dogs    * 20,
        'total_catches',           v_total_catches,
        'total_catches_points',    v_capped_catches * 10,
        'ear_tag_bonus_count',     v_ear_tag_count,
        'ear_tag_bonus_points',    v_ear_tag_count  * 5,
        'no_tag_bonus_count',      v_no_tag_count,
        'no_tag_bonus_points',     v_no_tag_count   * 5,
        'quest_bonus_points',      v_quest_bonus,
        'total_score',             v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- 2) Daily-quest claim: +5 → +15 XP
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
           AND DATE(timestamp) = v_today
    ) INTO v_has_sighting;
    IF NOT v_has_sighting THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_sighting_today');
    END IF;

    UPDATE public.profiles
       SET quest_bonus_total = quest_bonus_total + 15,
           quest_last_claimed_date = v_today
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'awarded', 15);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_daily_quest() TO authenticated;


-- ---------------------------------------------------------------------------
-- 3) Mission v4: target 20 → 5, per-dog grants ×10, completion +100
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

    IF v_award_date IS DISTINCT FROM CURRENT_DATE THEN
        v_today := 0;
    END IF;

    IF v_today >= v_daily_cap THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0, 'reason', 'daily_cap_reached');
    END IF;

    -- Escalating per-dog grants: 10, 20, 30, 40, 50.
    v_bonus := LEAST((v_count + 1) * 10, v_target * 10);

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
        v_completion_bonus := 100;

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
-- 4) Chunk grid v4: 316 chunks at 1.25 km cells
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_districts
    ADD COLUMN IF NOT EXISTS parent_slug TEXT,
    ADD COLUMN IF NOT EXISTS color_index INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 1;

DELETE FROM public.mission_dog_credits;
DELETE FROM public.mission_completions;
UPDATE public.profiles
   SET active_mission_slug = NULL,
       active_mission_started_at = NULL,
       active_mission_distinct_count = 0,
       active_mission_awards_today = 0,
       active_mission_award_date = NULL;

DELETE FROM public.mission_districts;

INSERT INTO public.mission_districts
    (slug, name_en, parent_slug, color_index, chunk_index, reward_xp)
VALUES
    ('chugureti-1', 'Chugureti 1', 'chugureti', 0, 1, 50),
    ('chugureti-2', 'Chugureti 2', 'chugureti', 0, 2, 50),
    ('chugureti-3', 'Chugureti 3', 'chugureti', 0, 3, 50),
    ('chugureti-4', 'Chugureti 4', 'chugureti', 0, 4, 50),
    ('chugureti-5', 'Chugureti 5', 'chugureti', 0, 5, 50),
    ('chugureti-6', 'Chugureti 6', 'chugureti', 0, 6, 50),
    ('chugureti-7', 'Chugureti 7', 'chugureti', 0, 7, 50),
    ('chugureti-8', 'Chugureti 8', 'chugureti', 0, 8, 50),
    ('chugureti-9', 'Chugureti 9', 'chugureti', 0, 9, 50),
    ('didube-1', 'Didube 1', 'didube', 1, 1, 50),
    ('didube-2', 'Didube 2', 'didube', 1, 2, 50),
    ('didube-3', 'Didube 3', 'didube', 1, 3, 50),
    ('didube-4', 'Didube 4', 'didube', 1, 4, 50),
    ('didube-5', 'Didube 5', 'didube', 1, 5, 50),
    ('didube-6', 'Didube 6', 'didube', 1, 6, 50),
    ('gldani-1', 'Gldani 1', 'gldani', 2, 1, 50),
    ('gldani-2', 'Gldani 2', 'gldani', 2, 2, 50),
    ('gldani-3', 'Gldani 3', 'gldani', 2, 3, 50),
    ('gldani-4', 'Gldani 4', 'gldani', 2, 4, 50),
    ('gldani-5', 'Gldani 5', 'gldani', 2, 5, 50),
    ('gldani-6', 'Gldani 6', 'gldani', 2, 6, 50),
    ('gldani-7', 'Gldani 7', 'gldani', 2, 7, 50),
    ('gldani-8', 'Gldani 8', 'gldani', 2, 8, 50),
    ('gldani-9', 'Gldani 9', 'gldani', 2, 9, 50),
    ('gldani-10', 'Gldani 10', 'gldani', 2, 10, 50),
    ('gldani-11', 'Gldani 11', 'gldani', 2, 11, 50),
    ('gldani-12', 'Gldani 12', 'gldani', 2, 12, 50),
    ('gldani-13', 'Gldani 13', 'gldani', 2, 13, 50),
    ('gldani-14', 'Gldani 14', 'gldani', 2, 14, 50),
    ('gldani-15', 'Gldani 15', 'gldani', 2, 15, 50),
    ('gldani-16', 'Gldani 16', 'gldani', 2, 16, 50),
    ('gldani-17', 'Gldani 17', 'gldani', 2, 17, 50),
    ('gldani-18', 'Gldani 18', 'gldani', 2, 18, 50),
    ('gldani-19', 'Gldani 19', 'gldani', 2, 19, 50),
    ('gldani-20', 'Gldani 20', 'gldani', 2, 20, 50),
    ('gldani-21', 'Gldani 21', 'gldani', 2, 21, 50),
    ('gldani-22', 'Gldani 22', 'gldani', 2, 22, 50),
    ('gldani-23', 'Gldani 23', 'gldani', 2, 23, 50),
    ('gldani-24', 'Gldani 24', 'gldani', 2, 24, 50),
    ('gldani-25', 'Gldani 25', 'gldani', 2, 25, 50),
    ('gldani-26', 'Gldani 26', 'gldani', 2, 26, 50),
    ('gldani-27', 'Gldani 27', 'gldani', 2, 27, 50),
    ('gldani-28', 'Gldani 28', 'gldani', 2, 28, 50),
    ('gldani-29', 'Gldani 29', 'gldani', 2, 29, 50),
    ('gldani-30', 'Gldani 30', 'gldani', 2, 30, 50),
    ('gldani-31', 'Gldani 31', 'gldani', 2, 31, 50),
    ('gldani-32', 'Gldani 32', 'gldani', 2, 32, 50),
    ('gldani-33', 'Gldani 33', 'gldani', 2, 33, 50),
    ('isani-1', 'Isani 1', 'isani', 3, 1, 50),
    ('isani-2', 'Isani 2', 'isani', 3, 2, 50),
    ('isani-3', 'Isani 3', 'isani', 3, 3, 50),
    ('isani-4', 'Isani 4', 'isani', 3, 4, 50),
    ('isani-5', 'Isani 5', 'isani', 3, 5, 50),
    ('isani-6', 'Isani 6', 'isani', 3, 6, 50),
    ('isani-7', 'Isani 7', 'isani', 3, 7, 50),
    ('isani-8', 'Isani 8', 'isani', 3, 8, 50),
    ('isani-9', 'Isani 9', 'isani', 3, 9, 50),
    ('isani-10', 'Isani 10', 'isani', 3, 10, 50),
    ('isani-11', 'Isani 11', 'isani', 3, 11, 50),
    ('krtsanisi-1', 'Krtsanisi 1', 'krtsanisi', 4, 1, 50),
    ('krtsanisi-2', 'Krtsanisi 2', 'krtsanisi', 4, 2, 50),
    ('krtsanisi-3', 'Krtsanisi 3', 'krtsanisi', 4, 3, 50),
    ('krtsanisi-4', 'Krtsanisi 4', 'krtsanisi', 4, 4, 50),
    ('krtsanisi-5', 'Krtsanisi 5', 'krtsanisi', 4, 5, 50),
    ('krtsanisi-6', 'Krtsanisi 6', 'krtsanisi', 4, 6, 50),
    ('krtsanisi-7', 'Krtsanisi 7', 'krtsanisi', 4, 7, 50),
    ('krtsanisi-8', 'Krtsanisi 8', 'krtsanisi', 4, 8, 50),
    ('krtsanisi-9', 'Krtsanisi 9', 'krtsanisi', 4, 9, 50),
    ('krtsanisi-10', 'Krtsanisi 10', 'krtsanisi', 4, 10, 50),
    ('krtsanisi-11', 'Krtsanisi 11', 'krtsanisi', 4, 11, 50),
    ('krtsanisi-12', 'Krtsanisi 12', 'krtsanisi', 4, 12, 50),
    ('krtsanisi-13', 'Krtsanisi 13', 'krtsanisi', 4, 13, 50),
    ('krtsanisi-14', 'Krtsanisi 14', 'krtsanisi', 4, 14, 50),
    ('krtsanisi-15', 'Krtsanisi 15', 'krtsanisi', 4, 15, 50),
    ('krtsanisi-16', 'Krtsanisi 16', 'krtsanisi', 4, 16, 50),
    ('krtsanisi-17', 'Krtsanisi 17', 'krtsanisi', 4, 17, 50),
    ('krtsanisi-18', 'Krtsanisi 18', 'krtsanisi', 4, 18, 50),
    ('krtsanisi-19', 'Krtsanisi 19', 'krtsanisi', 4, 19, 50),
    ('krtsanisi-20', 'Krtsanisi 20', 'krtsanisi', 4, 20, 50),
    ('krtsanisi-21', 'Krtsanisi 21', 'krtsanisi', 4, 21, 50),
    ('mtatsminda-1', 'Mtatsminda 1', 'mtatsminda', 5, 1, 50),
    ('mtatsminda-2', 'Mtatsminda 2', 'mtatsminda', 5, 2, 50),
    ('mtatsminda-3', 'Mtatsminda 3', 'mtatsminda', 5, 3, 50),
    ('mtatsminda-4', 'Mtatsminda 4', 'mtatsminda', 5, 4, 50),
    ('mtatsminda-5', 'Mtatsminda 5', 'mtatsminda', 5, 5, 50),
    ('mtatsminda-6', 'Mtatsminda 6', 'mtatsminda', 5, 6, 50),
    ('mtatsminda-7', 'Mtatsminda 7', 'mtatsminda', 5, 7, 50),
    ('mtatsminda-8', 'Mtatsminda 8', 'mtatsminda', 5, 8, 50),
    ('mtatsminda-9', 'Mtatsminda 9', 'mtatsminda', 5, 9, 50),
    ('mtatsminda-10', 'Mtatsminda 10', 'mtatsminda', 5, 10, 50),
    ('mtatsminda-11', 'Mtatsminda 11', 'mtatsminda', 5, 11, 50),
    ('mtatsminda-12', 'Mtatsminda 12', 'mtatsminda', 5, 12, 50),
    ('mtatsminda-13', 'Mtatsminda 13', 'mtatsminda', 5, 13, 50),
    ('mtatsminda-14', 'Mtatsminda 14', 'mtatsminda', 5, 14, 50),
    ('mtatsminda-15', 'Mtatsminda 15', 'mtatsminda', 5, 15, 50),
    ('mtatsminda-16', 'Mtatsminda 16', 'mtatsminda', 5, 16, 50),
    ('mtatsminda-17', 'Mtatsminda 17', 'mtatsminda', 5, 17, 50),
    ('mtatsminda-18', 'Mtatsminda 18', 'mtatsminda', 5, 18, 50),
    ('mtatsminda-19', 'Mtatsminda 19', 'mtatsminda', 5, 19, 50),
    ('mtatsminda-20', 'Mtatsminda 20', 'mtatsminda', 5, 20, 50),
    ('mtatsminda-21', 'Mtatsminda 21', 'mtatsminda', 5, 21, 50),
    ('mtatsminda-22', 'Mtatsminda 22', 'mtatsminda', 5, 22, 50),
    ('mtatsminda-23', 'Mtatsminda 23', 'mtatsminda', 5, 23, 50),
    ('mtatsminda-24', 'Mtatsminda 24', 'mtatsminda', 5, 24, 50),
    ('mtatsminda-25', 'Mtatsminda 25', 'mtatsminda', 5, 25, 50),
    ('mtatsminda-26', 'Mtatsminda 26', 'mtatsminda', 5, 26, 50),
    ('mtatsminda-27', 'Mtatsminda 27', 'mtatsminda', 5, 27, 50),
    ('mtatsminda-28', 'Mtatsminda 28', 'mtatsminda', 5, 28, 50),
    ('mtatsminda-29', 'Mtatsminda 29', 'mtatsminda', 5, 29, 50),
    ('mtatsminda-30', 'Mtatsminda 30', 'mtatsminda', 5, 30, 50),
    ('mtatsminda-31', 'Mtatsminda 31', 'mtatsminda', 5, 31, 50),
    ('mtatsminda-32', 'Mtatsminda 32', 'mtatsminda', 5, 32, 50),
    ('mtatsminda-33', 'Mtatsminda 33', 'mtatsminda', 5, 33, 50),
    ('mtatsminda-34', 'Mtatsminda 34', 'mtatsminda', 5, 34, 50),
    ('mtatsminda-35', 'Mtatsminda 35', 'mtatsminda', 5, 35, 50),
    ('mtatsminda-36', 'Mtatsminda 36', 'mtatsminda', 5, 36, 50),
    ('mtatsminda-37', 'Mtatsminda 37', 'mtatsminda', 5, 37, 50),
    ('mtatsminda-38', 'Mtatsminda 38', 'mtatsminda', 5, 38, 50),
    ('mtatsminda-39', 'Mtatsminda 39', 'mtatsminda', 5, 39, 50),
    ('mtatsminda-40', 'Mtatsminda 40', 'mtatsminda', 5, 40, 50),
    ('mtatsminda-41', 'Mtatsminda 41', 'mtatsminda', 5, 41, 50),
    ('mtatsminda-42', 'Mtatsminda 42', 'mtatsminda', 5, 42, 50),
    ('mtatsminda-43', 'Mtatsminda 43', 'mtatsminda', 5, 43, 50),
    ('nadzaladevi-1', 'Nadzaladevi 1', 'nadzaladevi', 6, 1, 50),
    ('nadzaladevi-2', 'Nadzaladevi 2', 'nadzaladevi', 6, 2, 50),
    ('nadzaladevi-3', 'Nadzaladevi 3', 'nadzaladevi', 6, 3, 50),
    ('nadzaladevi-4', 'Nadzaladevi 4', 'nadzaladevi', 6, 4, 50),
    ('nadzaladevi-5', 'Nadzaladevi 5', 'nadzaladevi', 6, 5, 50),
    ('nadzaladevi-6', 'Nadzaladevi 6', 'nadzaladevi', 6, 6, 50),
    ('nadzaladevi-7', 'Nadzaladevi 7', 'nadzaladevi', 6, 7, 50),
    ('nadzaladevi-8', 'Nadzaladevi 8', 'nadzaladevi', 6, 8, 50),
    ('nadzaladevi-9', 'Nadzaladevi 9', 'nadzaladevi', 6, 9, 50),
    ('nadzaladevi-10', 'Nadzaladevi 10', 'nadzaladevi', 6, 10, 50),
    ('nadzaladevi-11', 'Nadzaladevi 11', 'nadzaladevi', 6, 11, 50),
    ('nadzaladevi-12', 'Nadzaladevi 12', 'nadzaladevi', 6, 12, 50),
    ('nadzaladevi-13', 'Nadzaladevi 13', 'nadzaladevi', 6, 13, 50),
    ('nadzaladevi-14', 'Nadzaladevi 14', 'nadzaladevi', 6, 14, 50),
    ('nadzaladevi-15', 'Nadzaladevi 15', 'nadzaladevi', 6, 15, 50),
    ('nadzaladevi-16', 'Nadzaladevi 16', 'nadzaladevi', 6, 16, 50),
    ('nadzaladevi-17', 'Nadzaladevi 17', 'nadzaladevi', 6, 17, 50),
    ('nadzaladevi-18', 'Nadzaladevi 18', 'nadzaladevi', 6, 18, 50),
    ('nadzaladevi-19', 'Nadzaladevi 19', 'nadzaladevi', 6, 19, 50),
    ('nadzaladevi-20', 'Nadzaladevi 20', 'nadzaladevi', 6, 20, 50),
    ('nadzaladevi-21', 'Nadzaladevi 21', 'nadzaladevi', 6, 21, 50),
    ('nadzaladevi-22', 'Nadzaladevi 22', 'nadzaladevi', 6, 22, 50),
    ('nadzaladevi-23', 'Nadzaladevi 23', 'nadzaladevi', 6, 23, 50),
    ('nadzaladevi-24', 'Nadzaladevi 24', 'nadzaladevi', 6, 24, 50),
    ('nadzaladevi-25', 'Nadzaladevi 25', 'nadzaladevi', 6, 25, 50),
    ('nadzaladevi-26', 'Nadzaladevi 26', 'nadzaladevi', 6, 26, 50),
    ('nadzaladevi-27', 'Nadzaladevi 27', 'nadzaladevi', 6, 27, 50),
    ('saburtalo-1', 'Saburtalo 1', 'saburtalo', 7, 1, 50),
    ('saburtalo-2', 'Saburtalo 2', 'saburtalo', 7, 2, 50),
    ('saburtalo-3', 'Saburtalo 3', 'saburtalo', 7, 3, 50),
    ('saburtalo-4', 'Saburtalo 4', 'saburtalo', 7, 4, 50),
    ('saburtalo-5', 'Saburtalo 5', 'saburtalo', 7, 5, 50),
    ('saburtalo-6', 'Saburtalo 6', 'saburtalo', 7, 6, 50),
    ('saburtalo-7', 'Saburtalo 7', 'saburtalo', 7, 7, 50),
    ('saburtalo-8', 'Saburtalo 8', 'saburtalo', 7, 8, 50),
    ('saburtalo-9', 'Saburtalo 9', 'saburtalo', 7, 9, 50),
    ('saburtalo-10', 'Saburtalo 10', 'saburtalo', 7, 10, 50),
    ('saburtalo-11', 'Saburtalo 11', 'saburtalo', 7, 11, 50),
    ('saburtalo-12', 'Saburtalo 12', 'saburtalo', 7, 12, 50),
    ('saburtalo-13', 'Saburtalo 13', 'saburtalo', 7, 13, 50),
    ('saburtalo-14', 'Saburtalo 14', 'saburtalo', 7, 14, 50),
    ('saburtalo-15', 'Saburtalo 15', 'saburtalo', 7, 15, 50),
    ('saburtalo-16', 'Saburtalo 16', 'saburtalo', 7, 16, 50),
    ('saburtalo-17', 'Saburtalo 17', 'saburtalo', 7, 17, 50),
    ('saburtalo-18', 'Saburtalo 18', 'saburtalo', 7, 18, 50),
    ('saburtalo-19', 'Saburtalo 19', 'saburtalo', 7, 19, 50),
    ('saburtalo-20', 'Saburtalo 20', 'saburtalo', 7, 20, 50),
    ('saburtalo-21', 'Saburtalo 21', 'saburtalo', 7, 21, 50),
    ('saburtalo-22', 'Saburtalo 22', 'saburtalo', 7, 22, 50),
    ('saburtalo-23', 'Saburtalo 23', 'saburtalo', 7, 23, 50),
    ('saburtalo-24', 'Saburtalo 24', 'saburtalo', 7, 24, 50),
    ('saburtalo-25', 'Saburtalo 25', 'saburtalo', 7, 25, 50),
    ('saburtalo-26', 'Saburtalo 26', 'saburtalo', 7, 26, 50),
    ('saburtalo-27', 'Saburtalo 27', 'saburtalo', 7, 27, 50),
    ('saburtalo-28', 'Saburtalo 28', 'saburtalo', 7, 28, 50),
    ('saburtalo-29', 'Saburtalo 29', 'saburtalo', 7, 29, 50),
    ('saburtalo-30', 'Saburtalo 30', 'saburtalo', 7, 30, 50),
    ('saburtalo-31', 'Saburtalo 31', 'saburtalo', 7, 31, 50),
    ('saburtalo-32', 'Saburtalo 32', 'saburtalo', 7, 32, 50),
    ('saburtalo-33', 'Saburtalo 33', 'saburtalo', 7, 33, 50),
    ('saburtalo-34', 'Saburtalo 34', 'saburtalo', 7, 34, 50),
    ('saburtalo-35', 'Saburtalo 35', 'saburtalo', 7, 35, 50),
    ('saburtalo-36', 'Saburtalo 36', 'saburtalo', 7, 36, 50),
    ('saburtalo-37', 'Saburtalo 37', 'saburtalo', 7, 37, 50),
    ('saburtalo-38', 'Saburtalo 38', 'saburtalo', 7, 38, 50),
    ('saburtalo-39', 'Saburtalo 39', 'saburtalo', 7, 39, 50),
    ('saburtalo-40', 'Saburtalo 40', 'saburtalo', 7, 40, 50),
    ('saburtalo-41', 'Saburtalo 41', 'saburtalo', 7, 41, 50),
    ('saburtalo-42', 'Saburtalo 42', 'saburtalo', 7, 42, 50),
    ('saburtalo-43', 'Saburtalo 43', 'saburtalo', 7, 43, 50),
    ('saburtalo-44', 'Saburtalo 44', 'saburtalo', 7, 44, 50),
    ('saburtalo-45', 'Saburtalo 45', 'saburtalo', 7, 45, 50),
    ('saburtalo-46', 'Saburtalo 46', 'saburtalo', 7, 46, 50),
    ('samgori-1', 'Samgori 1', 'samgori', 8, 1, 50),
    ('samgori-2', 'Samgori 2', 'samgori', 8, 2, 50),
    ('samgori-3', 'Samgori 3', 'samgori', 8, 3, 50),
    ('samgori-4', 'Samgori 4', 'samgori', 8, 4, 50),
    ('samgori-5', 'Samgori 5', 'samgori', 8, 5, 50),
    ('samgori-6', 'Samgori 6', 'samgori', 8, 6, 50),
    ('samgori-7', 'Samgori 7', 'samgori', 8, 7, 50),
    ('samgori-8', 'Samgori 8', 'samgori', 8, 8, 50),
    ('samgori-9', 'Samgori 9', 'samgori', 8, 9, 50),
    ('samgori-10', 'Samgori 10', 'samgori', 8, 10, 50),
    ('samgori-11', 'Samgori 11', 'samgori', 8, 11, 50),
    ('samgori-12', 'Samgori 12', 'samgori', 8, 12, 50),
    ('samgori-13', 'Samgori 13', 'samgori', 8, 13, 50),
    ('samgori-14', 'Samgori 14', 'samgori', 8, 14, 50),
    ('samgori-15', 'Samgori 15', 'samgori', 8, 15, 50),
    ('samgori-16', 'Samgori 16', 'samgori', 8, 16, 50),
    ('samgori-17', 'Samgori 17', 'samgori', 8, 17, 50),
    ('samgori-18', 'Samgori 18', 'samgori', 8, 18, 50),
    ('samgori-19', 'Samgori 19', 'samgori', 8, 19, 50),
    ('samgori-20', 'Samgori 20', 'samgori', 8, 20, 50),
    ('samgori-21', 'Samgori 21', 'samgori', 8, 21, 50),
    ('samgori-22', 'Samgori 22', 'samgori', 8, 22, 50),
    ('samgori-23', 'Samgori 23', 'samgori', 8, 23, 50),
    ('samgori-24', 'Samgori 24', 'samgori', 8, 24, 50),
    ('samgori-25', 'Samgori 25', 'samgori', 8, 25, 50),
    ('samgori-26', 'Samgori 26', 'samgori', 8, 26, 50),
    ('samgori-27', 'Samgori 27', 'samgori', 8, 27, 50),
    ('samgori-28', 'Samgori 28', 'samgori', 8, 28, 50),
    ('samgori-29', 'Samgori 29', 'samgori', 8, 29, 50),
    ('samgori-30', 'Samgori 30', 'samgori', 8, 30, 50),
    ('samgori-31', 'Samgori 31', 'samgori', 8, 31, 50),
    ('samgori-32', 'Samgori 32', 'samgori', 8, 32, 50),
    ('samgori-33', 'Samgori 33', 'samgori', 8, 33, 50),
    ('samgori-34', 'Samgori 34', 'samgori', 8, 34, 50),
    ('samgori-35', 'Samgori 35', 'samgori', 8, 35, 50),
    ('samgori-36', 'Samgori 36', 'samgori', 8, 36, 50),
    ('samgori-37', 'Samgori 37', 'samgori', 8, 37, 50),
    ('samgori-38', 'Samgori 38', 'samgori', 8, 38, 50),
    ('samgori-39', 'Samgori 39', 'samgori', 8, 39, 50),
    ('samgori-40', 'Samgori 40', 'samgori', 8, 40, 50),
    ('samgori-41', 'Samgori 41', 'samgori', 8, 41, 50),
    ('samgori-42', 'Samgori 42', 'samgori', 8, 42, 50),
    ('samgori-43', 'Samgori 43', 'samgori', 8, 43, 50),
    ('samgori-44', 'Samgori 44', 'samgori', 8, 44, 50),
    ('samgori-45', 'Samgori 45', 'samgori', 8, 45, 50),
    ('samgori-46', 'Samgori 46', 'samgori', 8, 46, 50),
    ('samgori-47', 'Samgori 47', 'samgori', 8, 47, 50),
    ('samgori-48', 'Samgori 48', 'samgori', 8, 48, 50),
    ('samgori-49', 'Samgori 49', 'samgori', 8, 49, 50),
    ('samgori-50', 'Samgori 50', 'samgori', 8, 50, 50),
    ('samgori-51', 'Samgori 51', 'samgori', 8, 51, 50),
    ('samgori-52', 'Samgori 52', 'samgori', 8, 52, 50),
    ('samgori-53', 'Samgori 53', 'samgori', 8, 53, 50),
    ('samgori-54', 'Samgori 54', 'samgori', 8, 54, 50),
    ('samgori-55', 'Samgori 55', 'samgori', 8, 55, 50),
    ('samgori-56', 'Samgori 56', 'samgori', 8, 56, 50),
    ('samgori-57', 'Samgori 57', 'samgori', 8, 57, 50),
    ('samgori-58', 'Samgori 58', 'samgori', 8, 58, 50),
    ('samgori-59', 'Samgori 59', 'samgori', 8, 59, 50),
    ('samgori-60', 'Samgori 60', 'samgori', 8, 60, 50),
    ('samgori-61', 'Samgori 61', 'samgori', 8, 61, 50),
    ('samgori-62', 'Samgori 62', 'samgori', 8, 62, 50),
    ('samgori-63', 'Samgori 63', 'samgori', 8, 63, 50),
    ('samgori-64', 'Samgori 64', 'samgori', 8, 64, 50),
    ('samgori-65', 'Samgori 65', 'samgori', 8, 65, 50),
    ('samgori-66', 'Samgori 66', 'samgori', 8, 66, 50),
    ('samgori-67', 'Samgori 67', 'samgori', 8, 67, 50),
    ('samgori-68', 'Samgori 68', 'samgori', 8, 68, 50),
    ('samgori-69', 'Samgori 69', 'samgori', 8, 69, 50),
    ('samgori-70', 'Samgori 70', 'samgori', 8, 70, 50),
    ('samgori-71', 'Samgori 71', 'samgori', 8, 71, 50),
    ('samgori-72', 'Samgori 72', 'samgori', 8, 72, 50),
    ('samgori-73', 'Samgori 73', 'samgori', 8, 73, 50),
    ('samgori-74', 'Samgori 74', 'samgori', 8, 74, 50),
    ('samgori-75', 'Samgori 75', 'samgori', 8, 75, 50),
    ('samgori-76', 'Samgori 76', 'samgori', 8, 76, 50),
    ('samgori-77', 'Samgori 77', 'samgori', 8, 77, 50),
    ('samgori-78', 'Samgori 78', 'samgori', 8, 78, 50),
    ('samgori-79', 'Samgori 79', 'samgori', 8, 79, 50),
    ('samgori-80', 'Samgori 80', 'samgori', 8, 80, 50),
    ('samgori-81', 'Samgori 81', 'samgori', 8, 81, 50),
    ('samgori-82', 'Samgori 82', 'samgori', 8, 82, 50),
    ('vake-1', 'Vake 1', 'vake', 9, 1, 50),
    ('vake-2', 'Vake 2', 'vake', 9, 2, 50),
    ('vake-3', 'Vake 3', 'vake', 9, 3, 50),
    ('vake-4', 'Vake 4', 'vake', 9, 4, 50),
    ('vake-5', 'Vake 5', 'vake', 9, 5, 50),
    ('vake-6', 'Vake 6', 'vake', 9, 6, 50),
    ('vake-7', 'Vake 7', 'vake', 9, 7, 50),
    ('vake-8', 'Vake 8', 'vake', 9, 8, 50),
    ('vake-9', 'Vake 9', 'vake', 9, 9, 50),
    ('vake-10', 'Vake 10', 'vake', 9, 10, 50),
    ('vake-11', 'Vake 11', 'vake', 9, 11, 50),
    ('vake-12', 'Vake 12', 'vake', 9, 12, 50),
    ('vake-13', 'Vake 13', 'vake', 9, 13, 50),
    ('vake-14', 'Vake 14', 'vake', 9, 14, 50),
    ('vake-15', 'Vake 15', 'vake', 9, 15, 50),
    ('vake-16', 'Vake 16', 'vake', 9, 16, 50),
    ('vake-17', 'Vake 17', 'vake', 9, 17, 50),
    ('vake-18', 'Vake 18', 'vake', 9, 18, 50),
    ('vake-19', 'Vake 19', 'vake', 9, 19, 50),
    ('vake-20', 'Vake 20', 'vake', 9, 20, 50),
    ('vake-21', 'Vake 21', 'vake', 9, 21, 50),
    ('vake-22', 'Vake 22', 'vake', 9, 22, 50),
    ('vake-23', 'Vake 23', 'vake', 9, 23, 50),
    ('vake-24', 'Vake 24', 'vake', 9, 24, 50),
    ('vake-25', 'Vake 25', 'vake', 9, 25, 50),
    ('vake-26', 'Vake 26', 'vake', 9, 26, 50),
    ('vake-27', 'Vake 27', 'vake', 9, 27, 50),
    ('vake-28', 'Vake 28', 'vake', 9, 28, 50),
    ('vake-29', 'Vake 29', 'vake', 9, 29, 50),
    ('vake-30', 'Vake 30', 'vake', 9, 30, 50),
    ('vake-31', 'Vake 31', 'vake', 9, 31, 50),
    ('vake-32', 'Vake 32', 'vake', 9, 32, 50),
    ('vake-33', 'Vake 33', 'vake', 9, 33, 50),
    ('vake-34', 'Vake 34', 'vake', 9, 34, 50),
    ('vake-35', 'Vake 35', 'vake', 9, 35, 50),
    ('vake-36', 'Vake 36', 'vake', 9, 36, 50),
    ('vake-37', 'Vake 37', 'vake', 9, 37, 50),
    ('vake-38', 'Vake 38', 'vake', 9, 38, 50);
