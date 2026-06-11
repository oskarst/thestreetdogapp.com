-- ============================================================================
-- Score adjustments + hide the Legacy Import user from competitive surfaces.
--
-- 1. profiles.score_adjustment — a manual +/- offset folded into the total
--    score. A clean lever for one-off corrections without touching the
--    underlying dogs/sightings.
-- 2. get_user_score now adds score_adjustment to the total.
-- 3. The "Legacy Import" system user (legacy-import@street.dog, which owns the
--    AppSheet-imported dogs) is excluded from the leaderboard and from
--    quadrant domination — its DOGS stay visible everywhere, only its points /
--    presence on the boards are hidden so it doesn't dominate them.
-- 4. One-time: halve the points of oskarst@gmail.com (guarded against re-runs).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) score_adjustment column
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS score_adjustment INTEGER NOT NULL DEFAULT 0;


-- ---------------------------------------------------------------------------
-- 2) get_user_score v7: fold in score_adjustment
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
    v_adjustment          INTEGER;
    v_total_score         INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_new_dogs
      FROM public.dogs
     WHERE first_registered_by_id = p_user_id
       AND ear_tag_id IS NOT NULL
       AND deleted_at IS NULL;

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

    SELECT COALESCE(SUM(LEAST(daily_count, 5)), 0)::INTEGER INTO v_capped_catches
      FROM (
        SELECT COUNT(*) AS daily_count
          FROM public.sightings
         WHERE user_id = p_user_id
           AND deleted_at IS NULL
         GROUP BY dog_id, DATE(timestamp)
      ) per_day;

    SELECT COUNT(*) INTO v_ear_tag_count
      FROM public.sightings
     WHERE user_id = p_user_id
       AND deleted_at IS NULL
       AND ear_tag_image_url IS NOT NULL;

    SELECT COUNT(*) INTO v_no_tag_count
      FROM public.sightings s
      JOIN public.dogs d ON d.id = s.dog_id
     WHERE s.user_id = p_user_id
       AND s.deleted_at IS NULL
       AND d.deleted_at IS NULL
       AND d.ear_tag_id IS NULL;

    SELECT COALESCE(quest_bonus_total, 0), COALESCE(score_adjustment, 0)
      INTO v_quest_bonus, v_adjustment
      FROM public.profiles
     WHERE id = p_user_id;

    v_total_score := (v_new_dogs       * 100)
                   + (v_unique_dogs    * 65)
                   + (v_capped_catches * 35)
                   + (v_ear_tag_count  * 15)
                   + (v_no_tag_count   * 15)
                   + v_quest_bonus
                   + v_adjustment;

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
        'score_adjustment',        v_adjustment,
        'total_score',             v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- 3a) Leaderboard: exclude the Legacy Import system user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard_window()
RETURNS TABLE (
    rank      BIGINT,
    user_id   UUID,
    nickname  TEXT,
    score     INTEGER,
    is_me     BOOLEAN
) AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH scored AS (
        SELECT p.id,
               p.nickname,
               (public.get_user_score(p.id) ->> 'total_score')::INTEGER AS score
          FROM public.profiles p
         WHERE COALESCE(p.is_banned, false) = false
           AND p.email IS DISTINCT FROM 'legacy-import@street.dog'
    ),
    ranked AS (
        SELECT s.id,
               s.nickname,
               s.score,
               ROW_NUMBER() OVER (ORDER BY s.score DESC, s.nickname ASC NULLS LAST) AS rnk,
               COUNT(*) OVER () AS total
          FROM scored s
    ),
    me AS (
        SELECT r.rnk, r.total FROM ranked r WHERE r.id = v_uid
    ),
    bounds AS (
        SELECT LEAST(GREATEST(me.rnk - 1, 1), GREATEST(me.total - 3, 1)) AS start_rank
          FROM me
    )
    SELECT r.rnk, r.id, r.nickname, r.score, (r.id = v_uid)
      FROM ranked r, bounds b
     WHERE r.rnk BETWEEN b.start_rank AND b.start_rank + 3
     ORDER BY r.rnk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- 3b) Quadrant domination grid: exclude the Legacy Import user too, so chunks
--     aren't all "Dominated by Legacy Import". Its dogs still render on the map.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sighting_grid()
RETURNS TABLE (
    user_id  UUID,
    nickname TEXT,
    lat      DOUBLE PRECISION,
    lng      DOUBLE PRECISION,
    n        INTEGER
) AS $$
    SELECT s.user_id,
           p.nickname,
           ROUND(s.latitude::numeric,  3)::double precision AS lat,
           ROUND(s.longitude::numeric, 3)::double precision AS lng,
           COUNT(*)::INTEGER AS n
      FROM public.sightings s
      JOIN public.profiles p ON p.id = s.user_id
     WHERE s.deleted_at IS NULL
       AND COALESCE(p.is_banned, false) = false
       AND p.email IS DISTINCT FROM 'legacy-import@street.dog'
     GROUP BY s.user_id, p.nickname,
              ROUND(s.latitude::numeric, 3),
              ROUND(s.longitude::numeric, 3);
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- 4) One-time: halve oskarst@gmail.com's points via score_adjustment.
--    Guarded by the marker table so a re-run won't keep halving.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_id     UUID;
    v_total  INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public._scoring_migrations WHERE tag = '031_oskars_halve') THEN
        SELECT id INTO v_id FROM public.profiles WHERE email = 'oskarst@gmail.com';
        IF v_id IS NOT NULL THEN
            v_total := (public.get_user_score(v_id) ->> 'total_score')::INTEGER;
            UPDATE public.profiles
               SET score_adjustment = score_adjustment - FLOOR(v_total / 2.0)::INTEGER
             WHERE id = v_id;
        END IF;
        INSERT INTO public._scoring_migrations (tag) VALUES ('031_oskars_halve');
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
