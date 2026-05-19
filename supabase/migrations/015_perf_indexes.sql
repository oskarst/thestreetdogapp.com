-- ============================================================================
-- Performance indexes targeting the dashboard score RPC's hot scans.
--
-- The 6-COUNT get_user_score() does:
--   1. sightings WHERE user_id = $1                               (full scan today)
--   2. dogs WHERE first_registered_by_id = $1 AND ear_tag_id NOT NULL
--   3. sightings JOIN dogs WHERE user_id = $1 AND ear_tag_id NOT NULL
--   4. sightings GROUP BY (dog_id, DATE(timestamp)) WHERE user_id = $1
--   5. sightings WHERE user_id = $1 AND ear_tag_image_url NOT NULL
--   6. sightings JOIN dogs WHERE user_id = $1 AND ear_tag_id IS NULL
--
-- A composite index on (user_id, timestamp DESC) covers ordered scans
-- on the user's sightings (also speeds claim_daily_quest's today-check).
-- Partial indexes on the ear-tag-bonus and Pioneer counters keep the
-- index size small while still serving the targeted filter.
--
-- All idempotent — CREATE INDEX IF NOT EXISTS, safe to re-run.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sightings_user_timestamp_desc
  ON public.sightings (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sightings_user_eartag_photo
  ON public.sightings (user_id)
  WHERE ear_tag_image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dogs_first_registered_eartag
  ON public.dogs (first_registered_by_id)
  WHERE ear_tag_id IS NOT NULL;
