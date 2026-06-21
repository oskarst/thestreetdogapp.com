-- ============================================================================
-- Reverse-geocoding cache for city auto-detection.
--
-- When a dog is created, the sightings route reverse-geocodes its coordinates
-- (Nominatim / OpenStreetMap) to a real city name -> slug, instead of the
-- hardcoded bounding boxes. To respect Nominatim's ~1 req/sec policy and keep
-- dog-creation fast, results are cached here keyed by a rounded lat/lng grid
-- cell (~1km). A cache hit means no external call. On API failure the route
-- falls back to the bbox logic and does NOT cache, so it retries next time.
--
-- Service-role only: RLS is enabled with no policies, so normal clients can't
-- read/write it; the route uses the admin (service-role) client which bypasses
-- RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.geo_city_cache (
    cell        TEXT PRIMARY KEY,   -- "<lat.2f>_<lng.2f>" grid cell
    city_slug   TEXT NOT NULL,
    city_name   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.geo_city_cache ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
