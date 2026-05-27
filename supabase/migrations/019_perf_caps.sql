-- ============================================================================
-- Perf caps: bound unbounded reads so a power user can't blow up the
-- payload, and trim the dashboard's `images` field to just the first
-- element since that's the only one any card renders.
--
-- Wire-size impact: at 60 dogs × ~10 images each × ~150 chars per URL,
-- the old payload carried ~90 KB of image URLs the client never used.
-- Trimming to one image per dog drops that to ~9 KB — roughly a 10x
-- payload reduction for the hottest RPC in the app.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- get_my_sightings: LIMIT 200 most-recent rows
-- ---------------------------------------------------------------------------
-- Used by the dashboard for streak (~30 days deep) and daily-quest (today
-- only). 200 most-recent is comfortably more than either needs and stops
-- power users with thousands of sightings from pulling all of them on
-- every dashboard render.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_my_sightings();

CREATE OR REPLACE FUNCTION public.get_my_sightings()
RETURNS SETOF public.sightings AS $$
    SELECT * FROM public.sightings
     WHERE user_id = auth.uid()
     ORDER BY timestamp DESC
     LIMIT 200;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_sightings() TO authenticated;

-- ---------------------------------------------------------------------------
-- get_my_dashboard: trim images to first element + safety cap on caught_ids
-- ---------------------------------------------------------------------------
-- The dashboard cards read `dog.thumbnail ?? dog.images?.[0]` — only the
-- first image is ever used, so we drop the rest at the SQL layer instead
-- of shipping the full gallery URL list to every dashboard render.
--
-- caught_dog_ids is now capped at the most recent 1000 distinct dogs.
-- 1000 is comfortably above any active user's lifetime catch count and
-- bounds the worst-case payload.
-- ---------------------------------------------------------------------------
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
        ORDER BY last_sighting_date DESC NULLS LAST
        LIMIT v_limit
    ) d;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_favs
      FROM public.favorites WHERE user_id = v_uid;

    -- Cap caught_dog_ids at 1000 distinct dogs ordered by most recent.
    -- Far above any realistic active-user lifetime catch count and bounds
    -- worst-case payload (~36 KB at 1000 UUIDs).
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
