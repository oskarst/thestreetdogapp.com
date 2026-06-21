-- ============================================================================
-- City grouping + per-city ear tags.
--
-- 1. dogs.city_slug — which city a dog belongs to, derived from its last known
--    coordinates (admins can override). Mirrors the bounding boxes in
--    src/lib/cities.ts; keep the two in sync if a city's bbox changes.
-- 2. Backfill city_slug for existing dogs from last_latitude/last_longitude.
-- 3. Re-scope ear-tag uniqueness from GLOBAL to PER-CITY: the same ear-tag
--    number can now exist in two different cities as two distinct dogs. The
--    sighting-matching in src/app/api/sightings/route.ts is made city-aware to
--    match.
--
-- Idempotent: column add / index create are IF [NOT] EXISTS; the backfill only
-- touches rows whose city_slug is still NULL.
-- ============================================================================

-- 1) city_slug column -------------------------------------------------------
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS city_slug TEXT;

-- 2) derive_city_slug(lat, lng): mirrors the bounding boxes in cities.ts.
CREATE OR REPLACE FUNCTION public.derive_city_slug(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
) RETURNS TEXT AS $$
BEGIN
    IF p_lat IS NULL OR p_lng IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_lat BETWEEN 41.6  AND 41.88 AND p_lng BETWEEN 44.55 AND 45.05 THEN RETURN 'tbilisi'; END IF;
    IF p_lat BETWEEN 42.2  AND 42.34 AND p_lng BETWEEN 42.62 AND 42.82 THEN RETURN 'kutaisi'; END IF;
    IF p_lat BETWEEN 41.55 AND 41.7  AND p_lng BETWEEN 41.55 AND 41.73 THEN RETURN 'batumi';  END IF;
    IF p_lat BETWEEN 40.73 AND 40.85 AND p_lng BETWEEN 43.78 AND 43.91 THEN RETURN 'gyumri';  END IF;
    IF p_lat BETWEEN 40.1  AND 40.27 AND p_lng BETWEEN 44.38 AND 44.62 THEN RETURN 'yerevan'; END IF;
    RETURN 'other';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3) Backfill from last known coordinates -----------------------------------
UPDATE public.dogs
   SET city_slug = public.derive_city_slug(last_latitude, last_longitude)
 WHERE city_slug IS NULL
   AND last_latitude IS NOT NULL
   AND last_longitude IS NOT NULL;

-- 4) Index for filtering / grouping by city ---------------------------------
CREATE INDEX IF NOT EXISTS idx_dogs_city_slug ON public.dogs (city_slug);

-- 5) Re-scope ear-tag uniqueness: global -> per-city ------------------------
-- Drop the original global UNIQUE (ear_tag_id) from migration 001. The plain
-- lookup index idx_dogs_ear_tag_id stays for the ear-tag matching query.
ALTER TABLE public.dogs DROP CONSTRAINT IF EXISTS dogs_ear_tag_id_key;

-- A tag number is unique within a city. COALESCE folds NULL city into a
-- sentinel so two no-city dogs can't share a tag either. Soft-deleted dogs
-- are excluded so a deleted tag can be reused.
DROP INDEX IF EXISTS dogs_city_ear_tag_unique;
CREATE UNIQUE INDEX dogs_city_ear_tag_unique
    ON public.dogs (COALESCE(city_slug, '__none__'), ear_tag_id)
    WHERE ear_tag_id IS NOT NULL AND deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
