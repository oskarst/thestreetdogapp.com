-- ============================================================================
-- Dashboard ordering: "last dog I interacted with" on top.
--
-- The dog grid used to order by the dog's GLOBAL last_sighting_date, so a
-- repeat sighting you just logged didn't necessarily rise to the top (and
-- another user's activity could outrank yours). Now we order by YOUR most
-- recent sighting of each dog, falling back to the dog's global last-sighting
-- date for dogs you've never logged. Any sighting you make — first capture or
-- repeat — puts that dog at the very top of your list.
--
-- Only the ordering changes; the payload shape is identical.
-- ============================================================================

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
            -- Most-recently-interacted-with first: my own last sighting of the
            -- dog, else its global last-sighting date.
            ORDER BY COALESCE(d.my_last_seen, d.last_sighting_date) DESC NULLS LAST
        ),
        '[]'::jsonb
    ) INTO v_dogs
    FROM (
        SELECT dg.id, dg.ear_tag_id, dg.names, dg.images, dg.thumbnail,
               dg.last_sighting_date, dg.created_at, dg.first_registered_by_id,
               ms.my_last_seen
        FROM public.dogs dg
        LEFT JOIN (
            SELECT dog_id, MAX(timestamp) AS my_last_seen
            FROM public.sightings
            WHERE user_id = v_uid
              AND deleted_at IS NULL
            GROUP BY dog_id
        ) ms ON ms.dog_id = dg.id
        WHERE (dg.status = 'approved' OR dg.first_registered_by_id = v_uid)
          AND dg.deleted_at IS NULL
        ORDER BY COALESCE(ms.my_last_seen, dg.last_sighting_date) DESC NULLS LAST
        LIMIT v_limit
    ) d;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_favs
      FROM public.favorites WHERE user_id = v_uid;

    SELECT COALESCE(jsonb_agg(dog_id), '[]'::jsonb) INTO v_caught
      FROM (
          SELECT DISTINCT ON (dog_id) dog_id, MAX(timestamp) AS last_seen
          FROM public.sightings
          WHERE user_id = v_uid
            AND deleted_at IS NULL
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
