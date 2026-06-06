-- ============================================================================
-- Soft-launch perf pass: descending index for the dashboard's top-N dog scan,
-- a LIMIT cap on get_my_caught_dog_ids, and the missing FK index on
-- mission_completions.district_slug.
-- All idempotent — CREATE INDEX IF NOT EXISTS / CREATE OR REPLACE FUNCTION.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Descending index for the dashboard RPC's top-N dog scan
-- ---------------------------------------------------------------------------
-- get_my_dashboard() (migration 016/019) orders public.dogs by
--   last_sighting_date DESC NULLS LAST LIMIT v_limit
-- on every landing. The existing index from migration 001
-- (idx_dogs_last_sighting_date, plain ASC) can't serve that ordered top-N, so
-- Postgres falls back to a Seq Scan + full Sort. A matching DESC NULLS LAST
-- index lets it read the first v_limit rows straight off the index.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dogs_last_sighting_date_desc
  ON public.dogs (last_sighting_date DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- 2) Cap get_my_caught_dog_ids at 1000 distinct dogs
-- ---------------------------------------------------------------------------
-- Original (migration 005) scans the user's full sightings with no cap. The
-- dashboard RPC's caught_dog_ids was bounded to 1000 in migration 019; this
-- slim gallery variant matches that cap. Signature/return type preserved.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_caught_dog_ids()
RETURNS TABLE (dog_id UUID) AS $$
    SELECT dog_id FROM (
        SELECT DISTINCT ON (dog_id) dog_id, MAX(timestamp) AS last_seen
          FROM public.sightings
         WHERE user_id = auth.uid()
         GROUP BY dog_id
         ORDER BY dog_id, last_seen DESC
         LIMIT 1000
    ) c;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.get_my_caught_dog_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) FK index on mission_completions.district_slug
-- ---------------------------------------------------------------------------
-- The district_slug FK (migration 008) has no backing index. Indexing it
-- keeps the FK check and any per-district lookup off a Seq Scan.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mission_completions_district_slug
  ON public.mission_completions (district_slug);

-- ---------------------------------------------------------------------------
-- 4) Grouped sighting counts for the admin dogs list
-- ---------------------------------------------------------------------------
-- The admin dogs route needs a sightings_count per dog. Counting by pulling
-- every sightings row into JS (or issuing one COUNT round-trip per dog) is
-- wasteful; this returns exact counts for a bounded set of dog ids in a single
-- grouped query. Admin-only — invoked via the service-role client, so it is
-- intentionally NOT granted to authenticated/anon.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dog_sighting_counts(p_dog_ids UUID[])
RETURNS TABLE (dog_id UUID, cnt BIGINT) AS $$
    SELECT s.dog_id, COUNT(*)::BIGINT
      FROM public.sightings s
     WHERE s.dog_id = ANY(p_dog_ids)
     GROUP BY s.dog_id;
$$ LANGUAGE sql STABLE;

NOTIFY pgrst, 'reload schema';
