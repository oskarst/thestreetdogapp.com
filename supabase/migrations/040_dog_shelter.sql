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
