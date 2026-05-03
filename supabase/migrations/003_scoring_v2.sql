-- Scoring v2: daily-quest XP, soft cap on repeat sightings, ear-tag bonus.
--
-- 1. Daily directive ("spot 1 dog today") becomes claimable for +5 XP, capped
--    at one claim per calendar day. Tracked on profiles via a date column +
--    a running bonus total.
-- 2. Repeat sightings of the same dog cap at 5 per day for the
--    total_catches_points contribution (anti-farming).
-- 3. Each sighting that includes an ear-tag photo earns +2 (welfare bonus).
--
-- Backwards-compatible — old clients calling get_user_score keep working;
-- they just see new fields they ignore.

-- 1) Daily-quest tracking columns -------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS quest_last_claimed_date DATE,
    ADD COLUMN IF NOT EXISTS quest_bonus_total INTEGER NOT NULL DEFAULT 0;

-- 2) Updated scoring RPC ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_score(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_new_dogs            INTEGER;
    v_unique_dogs         INTEGER;
    v_total_catches       INTEGER;
    v_capped_catches      INTEGER;
    v_ear_tag_count       INTEGER;
    v_quest_bonus         INTEGER;
    v_total_score         INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_new_dogs
      FROM public.dogs
     WHERE first_registered_by_id = p_user_id;

    SELECT COUNT(DISTINCT dog_id) INTO v_unique_dogs
      FROM public.sightings
     WHERE user_id = p_user_id;

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

    -- Welfare bonus: every sighting with an ear-tag photo earns +2.
    SELECT COUNT(*) INTO v_ear_tag_count
      FROM public.sightings
     WHERE user_id = p_user_id
       AND ear_tag_image_url IS NOT NULL;

    SELECT COALESCE(quest_bonus_total, 0) INTO v_quest_bonus
      FROM public.profiles
     WHERE id = p_user_id;

    v_total_score := (v_new_dogs * 10)
                   + (v_unique_dogs * 5)
                   + (v_capped_catches * 1)
                   + (v_ear_tag_count * 2)
                   + v_quest_bonus;

    RETURN jsonb_build_object(
        'new_dogs',                v_new_dogs,
        'new_dogs_points',         v_new_dogs * 10,
        'unique_dogs',             v_unique_dogs,
        'unique_dogs_points',      v_unique_dogs * 5,
        'total_catches',           v_total_catches,
        'total_catches_points',    v_capped_catches,
        'ear_tag_bonus_count',     v_ear_tag_count,
        'ear_tag_bonus_points',    v_ear_tag_count * 2,
        'quest_bonus_points',      v_quest_bonus,
        'total_score',             v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3) Daily-quest claim RPC --------------------------------------------------
-- Called by the dashboard when the user taps "claim" on the daily directive.
-- Awards +5 XP if they've logged at least one sighting today and haven't
-- already claimed today.
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
       SET quest_bonus_total = quest_bonus_total + 5,
           quest_last_claimed_date = v_today
     WHERE id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'awarded', 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_daily_quest() TO authenticated;
