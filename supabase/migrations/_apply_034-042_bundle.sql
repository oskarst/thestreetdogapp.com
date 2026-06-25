-- Combined apply script: migrations 034, 037, 038, 039, 040, 041, 042, 043
-- All idempotent; safe to re-run even after a partial/failed run.


-- ======================================================================
-- 034_data_report.sql
-- ======================================================================
-- ============================================================================
-- "Report bad data" on a dog page.
--
-- Files a row in the existing public.reports table with report_type 'issue'
-- (wrong / bad data), so it surfaces in the admin reports queue alongside
-- other reports. Goes through an RPC — same posture as submit_health_report —
-- so the body is validated and the insert isn't exposed to the client.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_data_report(
    p_dog_id UUID,
    p_body   TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trimmed TEXT;
    v_id      UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    v_trimmed := btrim(COALESCE(p_body, ''));
    IF length(v_trimmed) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'body_too_short');
    END IF;
    IF length(v_trimmed) > 2000 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'body_too_long');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.dogs WHERE id = p_dog_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dog_not_found');
    END IF;

    INSERT INTO public.reports (user_id, dog_id, report_type, message)
    VALUES (v_user_id, p_dog_id, 'issue', v_trimmed)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_data_report(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ======================================================================
-- 037_city_grouping.sql
-- ======================================================================
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

-- ======================================================================
-- 038_geo_city_cache.sql
-- ======================================================================
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

-- ======================================================================
-- 039_analytics_views.sql
-- ======================================================================
-- ============================================================================
-- Public open-dataset views.
--
-- Curated, PII-free projections of dogs + sightings for export to BigQuery (or
-- any public dataset). NO emails, NO raw user ids: the contributor is reduced
-- to a stable pseudonymous hash so "distinct contributors" analytics work
-- without revealing identity. Only approved, non-deleted records are exposed.
--
-- These are the ONLY things the BigQuery export reads; raw tables never leave
-- the database.
-- ============================================================================

-- Dogs ----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.analytics_dogs AS
SELECT
    d.id,
    d.ear_tag_id,
    (d.ear_tag_id IS NOT NULL)                       AS is_tagged,
    d.city_slug,
    d."character",
    d.size,
    d.gender,
    d.age,
    d.last_latitude,
    d.last_longitude,
    d.created_at                                     AS first_seen,
    d.last_sighting_date,
    -- Pseudonymous contributor id (not reversible to a user).
    md5(d.first_registered_by_id::text)              AS contributor_hash
FROM public.dogs d
WHERE d.status = 'approved'
  AND d.deleted_at IS NULL;

-- Sightings -----------------------------------------------------------------
-- health_flag normally arrives via migration 022. Guard it here so this view
-- doesn't depend on 022 having been applied first (no-op if it already has).
ALTER TABLE public.sightings
    ADD COLUMN IF NOT EXISTS health_flag BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.analytics_sightings AS
SELECT
    s.id,
    s.dog_id,
    d.city_slug,
    s.latitude,
    s.longitude,
    s."timestamp",
    s."character",
    s.size,
    s.gender,
    s.age,
    s.health_flag,
    md5(s.user_id::text)                             AS contributor_hash
FROM public.sightings s
JOIN public.dogs d ON d.id = s.dog_id
WHERE s.deleted_at IS NULL
  AND d.deleted_at IS NULL
  AND d.status = 'approved';

-- The export uses the service-role client (bypasses RLS); no extra grants
-- needed. Intentionally NOT granted to anon/authenticated so these aren't
-- queryable through the public PostgREST API.

NOTIFY pgrst, 'reload schema';

-- ======================================================================
-- 040_dog_shelter.sql
-- ======================================================================
-- ============================================================================
-- "Lives in a shelter" flag on dogs.
--
-- A welfare attribute set from the Add-Dog form (a subtle checkbox next to the
-- aggressive flag). It's a property of the dog, not a single sighting, so it
-- lives on the dogs row. New dogs store the checkbox value; re-sightings only
-- promote it to true (so a passer-by who doesn't tick the box can't silently
-- clear a known shelter dog). Admins can correct it in the dogs editor.
-- ============================================================================

ALTER TABLE public.dogs
    ADD COLUMN IF NOT EXISTS in_shelter BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dogs_in_shelter
    ON public.dogs (in_shelter)
    WHERE in_shelter = true;

NOTIFY pgrst, 'reload schema';

-- ======================================================================
-- 041_shelter_info.sql
-- ======================================================================
-- ============================================================================
-- Shelter info text.
--
-- When a dog is marked as living in a shelter, the reporter can add free-text
-- shelter info (name, address, contact). It is:
--   - stored on the dog (dogs.shelter_info), and
--   - remembered on the reporter's profile (profiles.shelter_info) so the
--     Add-Dog form can prepopulate it next time they tick the shelter box.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shelter_info TEXT;
ALTER TABLE public.dogs     ADD COLUMN IF NOT EXISTS shelter_info TEXT;

NOTIFY pgrst, 'reload schema';

-- ======================================================================
-- 042_update_my_sighting.sql
-- ======================================================================
-- ============================================================================
-- Let a user edit their OWN sighting's info.
--
-- RLS only lets admins UPDATE sightings, so self-edit goes through this
-- SECURITY DEFINER RPC. It edits only descriptive fields (character, size,
-- gender, age, notes) of a row the caller owns and hasn't soft-deleted.
-- Location, timestamp, images, dog_id and health_flag stay immutable here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_my_sighting(
    p_id        UUID,
    p_character TEXT,
    p_size      INTEGER,
    p_gender    TEXT,
    p_age       TEXT,
    p_notes     TEXT
) RETURNS JSONB AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_notes TEXT;
    v_rows  INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_character NOT IN
       ('friendly','very_friendly','indifferent','sleeping','afraid','aggressive') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_character');
    END IF;
    IF p_gender NOT IN ('male','female','unknown') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_gender');
    END IF;
    IF p_age NOT IN ('puppy','young','adult','old') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_age');
    END IF;
    IF p_size IS NULL OR p_size < 1 OR p_size > 10 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_size');
    END IF;

    v_notes := btrim(COALESCE(p_notes, ''));
    IF length(v_notes) > 2000 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'notes_too_long');
    END IF;

    UPDATE public.sightings
       SET character = p_character::public.dog_character,
           size      = p_size,
           gender    = p_gender::public.dog_gender,
           age       = p_age::public.dog_age,
           notes     = NULLIF(v_notes, '')
     WHERE id = p_id
       AND user_id = v_uid
       AND deleted_at IS NULL;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.update_my_sighting(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_sighting(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ======================================================================
-- 043_delete_my_sightings_for_dog.sql
-- ======================================================================
-- ============================================================================
-- Let a user delete only THEIR OWN data for a single dog.
--
-- Soft-deletes (stamps deleted_at) the caller's sightings of one dog. Other
-- people's sightings and the dog itself are untouched, so a shared dog stays
-- visible. Mirrors the GDPR soft_delete_my_dog_data pattern, scoped to one dog.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_sightings_for_dog(p_dog_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_count INTEGER := 0;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    UPDATE public.sightings
       SET deleted_at = NOW()
     WHERE user_id = v_uid
       AND dog_id = p_dog_id
       AND deleted_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object('ok', true, 'deleted', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.delete_my_sightings_for_dog(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_my_sightings_for_dog(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
