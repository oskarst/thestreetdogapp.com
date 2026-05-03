-- Composite index for the hot dog-detail query path.
--
-- Both getSightingsForDog (full history per dog, sorted desc) and
-- getRecentSightings (dog + timestamp >= since, sorted desc) filter by
-- dog_id and order by timestamp DESC. The single-column idx_sightings_dog_id
-- index covers the WHERE but forces a sort. This index lets Postgres do an
-- index-only range scan and skip the sort entirely.
--
-- IF NOT EXISTS so re-runs are safe.
CREATE INDEX IF NOT EXISTS idx_sightings_dog_id_timestamp
    ON public.sightings (dog_id, timestamp DESC);
