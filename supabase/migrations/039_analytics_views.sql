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
    d.character,
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
    s.timestamp,
    s.character,
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
