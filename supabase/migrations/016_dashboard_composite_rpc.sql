-- ============================================================================
-- Composite dashboard RPC + dogs.thumbnail column.
--
-- Today the dashboard fires ~5 separate Supabase round-trips per render:
--   1. get_my_profile (cached via layout)
--   2. get_my_sightings (cached)
--   3. getDogs() — unbounded scan of public.dogs
--   4. getUserFavorites
--   5. get_user_score (itself runs ~6 COUNT scans server-side)
-- get_my_dashboard() collapses 3-5 into one JSONB payload. Cap p_limit
-- with LEAST(p_limit, 200) so a malicious client can't request the entire
-- dog table.
--
-- dogs.thumbnail: nullable column for a 320×320 webp variant generated at
-- upload time. Older rows remain null until backfill; clients fall back
-- to images[0] in the meantime.
-- ============================================================================

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS thumbnail TEXT;

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

    -- Latest dogs, slim projection. is_first_found pre-computed for the
    -- dashboard tab filter.
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id',                     d.id,
                'ear_tag_id',             d.ear_tag_id,
                'names',                  d.names,
                'images',                 d.images,
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

    SELECT COALESCE(jsonb_agg(DISTINCT dog_id), '[]'::jsonb) INTO v_caught
      FROM public.sightings WHERE user_id = v_uid;

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
