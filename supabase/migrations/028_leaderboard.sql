-- ============================================================================
-- Leaderboard window: the caller's rank plus the players just above and below.
--
-- Returns at most 4 rows centred on the caller (1 above + you + 2 below),
-- clamped at the leaderboard's top and bottom so the strip always shows a
-- full 4 when there are enough players. Powers the leaderboard block under
-- the missions chooser.
--
-- Scores reuse get_user_score per profile (single source of truth). That's
-- one function call per non-banned player; fine at the current user scale and
-- the block only renders on the missions page. Revisit with a materialized
-- score column if the player base grows large.
-- ============================================================================

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
        -- Start one above the caller, but never past the top (1) or so far
        -- down that the 4-row window runs off the bottom.
        SELECT LEAST(GREATEST(me.rnk - 1, 1), GREATEST(me.total - 3, 1)) AS start_rank
          FROM me
    )
    SELECT r.rnk, r.id, r.nickname, r.score, (r.id = v_uid)
      FROM ranked r, bounds b
     WHERE r.rnk BETWEEN b.start_rank AND b.start_rank + 3
     ORDER BY r.rnk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_window() TO authenticated;

NOTIFY pgrst, 'reload schema';
