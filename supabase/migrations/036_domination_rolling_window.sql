-- ============================================================================
-- Quadrant domination: rolling 3-month window.
--
-- Before, domination counted ALL-TIME sightings, so whoever logged the most in
-- a chunk first could hold it forever — not engaging, and a head start was
-- permanent. Now the grid only counts sightings from the last 3 months, so a
-- district is a living competition: you have to keep showing up to hold it, and
-- anyone can take it back with recent activity. Tune the interval to taste
-- (30 days = very dynamic, 3 months = forgiving).
--
-- Legacy Import (now "Anita") is still excluded so it doesn't dominate.
-- ============================================================================

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
       AND s.timestamp >= NOW() - INTERVAL '3 months'
       AND COALESCE(p.is_banned, false) = false
       AND p.email IS DISTINCT FROM 'legacy-import@street.dog'
     GROUP BY s.user_id, p.nickname,
              ROUND(s.latitude::numeric, 3),
              ROUND(s.longitude::numeric, 3);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

NOTIFY pgrst, 'reload schema';
