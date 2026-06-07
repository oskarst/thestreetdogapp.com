-- ============================================================================
-- Dog moderation status.
--
-- When an uploaded photo has no visible dog, the dog is still saved for the
-- user but kept out of all public views until an admin approves it. Adds a
-- status column, hides non-approved dogs at the RLS layer (defense in depth;
-- the app also filters in each query/RPC), and updates the dashboard RPC.
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1) status enum + column. Default 'approved' so existing rows and normal
--    dog photos stay public; the sightings route sets 'pending' only when no
--    dog is detected. ADD COLUMN ... DEFAULT backfills existing rows.
DO $$ BEGIN
  CREATE TYPE public.dog_status AS ENUM ('approved', 'pending', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS status public.dog_status NOT NULL DEFAULT 'approved';

-- Partial index for the admin pending queue.
CREATE INDEX IF NOT EXISTS idx_dogs_status_pending
  ON public.dogs (created_at DESC)
  WHERE status = 'pending';

-- 2) RLS: non-approved dogs are readable only by their creator and admins.
--    (App-level filters still apply for service-role/SECURITY DEFINER reads.)
DROP POLICY IF EXISTS dogs_select ON public.dogs;
CREATE POLICY dogs_select ON public.dogs
    FOR SELECT TO authenticated
    USING (
        status = 'approved'
        OR first_registered_by_id = auth.uid()
        OR public.is_admin()
    );

-- 3) Dashboard RPC: list approved dogs plus the viewer's own (pending too),
--    preserving the migration-019 image-trim + caught-ids cap.
CREATE OR REPLACE FUNCTION public.get_my_dashboard(p_limit INTEGER DEFAULT 60)
RETURNS JSONB AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_limit   INTEGER := LEAST(GREATEST(COALESCE(p_limit, 60), 1), 200);
    v_dogs    JSONB;
    v_favs    JSONB;
    v_caught  JSONB;
    v_score   JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id',                     d.id,
                'ear_tag_id',             d.ear_tag_id,
                'names',                  d.names,
                'images', CASE
                    WHEN d.images IS NOT NULL
                         AND jsonb_typeof(d.images) = 'array'
                         AND jsonb_array_length(d.images) > 0
                    THEN jsonb_build_array(d.images->0)
                    ELSE '[]'::jsonb
                END,
                'thumbnail',              d.thumbnail,
                'last_sighting_date',     d.last_sighting_date,
                'created_at',             d.created_at,
                'first_registered_by_id', d.first_registered_by_id,
                'is_first_found',         d.first_registered_by_id = v_uid
            )
            ORDER BY d.last_sighting_date DESC NULLS LAST
        ),
        '[]'::jsonb
    ) INTO v_dogs
    FROM (
        SELECT id, ear_tag_id, names, images, thumbnail,
               last_sighting_date, created_at, first_registered_by_id
        FROM public.dogs
        WHERE status = 'approved' OR first_registered_by_id = v_uid
        ORDER BY last_sighting_date DESC NULLS LAST
        LIMIT v_limit
    ) d;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_favs
      FROM public.favorites WHERE user_id = v_uid;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_caught
      FROM (
          SELECT DISTINCT ON (dog_id) dog_id, MAX(timestamp) AS last_seen
          FROM public.sightings
          WHERE user_id = v_uid
          GROUP BY dog_id
          ORDER BY dog_id, last_seen DESC
          LIMIT 1000
      ) c;

    v_score := public.get_user_score(v_uid);

    RETURN jsonb_build_object(
        'ok',                true,
        'dogs',              v_dogs,
        'favorite_ids',      v_favs,
        'caught_dog_ids',    v_caught,
        'score',             v_score,
        'dog_limit',         v_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_dashboard(INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
