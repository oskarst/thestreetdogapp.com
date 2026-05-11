-- Scoring v4: untagged dogs no longer mint Pioneer (+10) or Tracker (+5)
-- bonuses. Without an ear tag we can't deduplicate, so treating every
-- untagged sighting as a brand-new "unique dog" inflates scores and
-- rewards repeat photos of the same animal.
--
-- The +2/sighting welfare bonus from migration 007 stays — cataloguing an
-- unidentified dog is still useful work, just not Pioneer-tier.
--
-- Net effect for one untagged sighting: +1 (base) + +2 (welfare) = 3 pt.
-- Net effect for one tagged-new sighting: +10 (Pioneer) + +5 (Tracker)
-- + +1 (base) + optional +2 (ear-tag photo) = 16-18 pt as before.
--
-- Retroactive: scores are read-computed, so existing untagged dogs in the
-- DB will rebalance immediately when this ships. Users who logged many
-- untagged dogs as Pioneers will see their totals drop.
--
-- Idempotent — replaces get_user_score in place.

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

    -- Welfare bonus 1: every sighting with an ear-tag photo earns +2.
    SELECT COUNT(*) INTO v_ear_tag_count
      FROM public.sightings
     WHERE user_id = p_user_id
       AND ear_tag_image_url IS NOT NULL;

    -- Welfare bonus 2: every sighting of an *untagged* dog earns +2.
    SELECT COUNT(*) INTO v_no_tag_count
      FROM public.sightings s
      JOIN public.dogs d ON d.id = s.dog_id
     WHERE s.user_id = p_user_id
       AND d.ear_tag_id IS NULL;

    SELECT COALESCE(quest_bonus_total, 0) INTO v_quest_bonus
      FROM public.profiles
     WHERE id = p_user_id;

    v_total_score := (v_new_dogs * 10)
                   + (v_unique_dogs * 5)
                   + (v_capped_catches * 1)
                   + (v_ear_tag_count * 2)
                   + (v_no_tag_count * 2)
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
        'no_tag_bonus_count',      v_no_tag_count,
        'no_tag_bonus_points',     v_no_tag_count * 2,
        'quest_bonus_points',      v_quest_bonus,
        'total_score',             v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
