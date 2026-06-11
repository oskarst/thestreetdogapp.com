-- ============================================================================
-- Quadrant domination: data source for "who owns each mission chunk".
--
-- The chunk polygons live in a geojson file, not the DB, so the point-in-
-- polygon bucketing runs server-side in the map route. To keep that cheap we
-- don't ship raw sightings — we ship a *grid*: each non-banned user's live
-- sightings collapsed to ~111 m cells (lat/lng rounded to 3 decimals) with a
-- count. The route buckets cells into chunks and the user with the most
-- sightings in a chunk "dominates" it.
--
-- Payload is bounded by (#users x #occupied 111 m cells) instead of the raw
-- sighting count, and aggregation happens in Postgres where it's cheapest.
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
       AND COALESCE(p.is_banned, false) = false
     GROUP BY s.user_id, p.nickname,
              ROUND(s.latitude::numeric, 3),
              ROUND(s.longitude::numeric, 3);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_sighting_grid() TO authenticated;

NOTIFY pgrst, 'reload schema';
