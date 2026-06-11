-- ============================================================================
-- GDPR groundwork: soft-delete columns on the user-generated tables.
--
-- "Delete my data" in the account screen is a *soft* delete — we stamp
-- deleted_at = now() rather than dropping rows, so the action is reversible
-- by an admin and referential integrity (shared dogs, other users' sightings)
-- stays intact. Every read surface that builds scores or public views filters
-- `deleted_at IS NULL` from migration 027 onward.
--
-- Idempotent — safe to re-run.
-- ============================================================================

ALTER TABLE public.dogs
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.sightings
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes keep the hot "live rows only" reads cheap: the planner can
-- skip soft-deleted rows entirely instead of filtering them after the scan.
CREATE INDEX IF NOT EXISTS idx_dogs_live
    ON public.dogs (last_sighting_date DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sightings_live_user
    ON public.sightings (user_id)
    WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
