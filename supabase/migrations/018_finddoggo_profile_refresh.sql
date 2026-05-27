-- ============================================================================
-- Force get_my_profile() to re-resolve its return type after migration 017
-- added the active_finddoggo_* columns.
--
-- Background: PostgreSQL SQL functions declared as `RETURNS sometable` bind
-- the row type at function creation time. ALTER TABLE adding columns later
-- does not always propagate, and the existing function can keep returning
-- the old column set. The symptom is that `profile.active_finddoggo_dog_id`
-- comes back undefined on the client even though the column exists and the
-- row in `profiles` has the value set, so the UI keeps showing the "Start
-- hunt" screen and getting stuck.
--
-- DROP + CREATE forces PostgREST to re-introspect the schema and ensures
-- subsequent calls return the full current profiles row, including all
-- active_finddoggo_* fields.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles AS $$
    SELECT * FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Ask PostgREST to reload its schema cache immediately, so the next API
-- call returns the new columns without waiting for the auto-reload.
NOTIFY pgrst, 'reload schema';
