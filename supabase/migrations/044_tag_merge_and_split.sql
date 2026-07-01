-- ============================================================================
-- Tag correction: merge-on-conflict (forward) + split-a-sighting (reverse).
--
-- Physical ear tags are unique within a city (migration 037). So when a user
-- gives a dog a tag that already belongs to another dog IN THE SAME CITY,
-- there are only two possibilities: it's the SAME dog (merge), or it was a
-- typo (needs to be split back out). This migration handles both.
--
--   1. update_my_dog_ear_tag — rewritten. Instead of erroring 'tag_taken',
--      a genuine same-city collision now MERGES the caller's (duplicate) dog
--      into the pre-existing one that already holds the tag: its sightings,
--      images, favorites and names move over, then the duplicate is
--      soft-deleted. The user's contribution survives as a sighting of the
--      real dog. Scoring is fully derived (migration 031) so points recompute
--      automatically — no ledger to unwind.
--
--      The old conflict check was ALSO wrong: it checked globally and counted
--      soft-deleted dogs, stricter than the real per-city, live-only unique
--      index. Now it matches the index exactly, so different-city / deleted
--      collisions stop being false positives.
--
--   2. correct_my_sighting_tag — new. The mirror. A mistyped tag at add time
--      silently attaches your genuinely-new dog as a sighting of someone
--      else's dog. This lets a user re-home ONE of THEIR OWN sightings onto
--      the correct tag: if that tag matches another live dog, the sighting
--      re-points to it; if it matches nothing, a fresh dog is spun out from
--      the sighting (the split). Only touches the caller's own sighting.
--
-- Both are SECURITY DEFINER: merging/splitting legitimately writes dogs and
-- sightings the caller doesn't own via RLS, but the caller is authenticated
-- and only ever acts on their own dog / their own sighting.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Owner-only: change the ear tag id, merging into an existing dog on a
--    genuine same-city collision.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_dog_ear_tag(
    p_dog_id      UUID,
    p_ear_tag_id  TEXT
) RETURNS JSONB AS $$
DECLARE
    v_uid        UUID := auth.uid();
    v_owner      UUID;
    v_city       TEXT;
    v_tag        TEXT;
    v_canon      UUID;
    v_src_imgs   JSONB;
    v_src_names  JSONB;
    v_src_et_img TEXT;
    v_src_date   TIMESTAMPTZ;
    v_src_lat    DOUBLE PRECISION;
    v_src_lng    DOUBLE PRECISION;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT first_registered_by_id, city_slug, images, names,
           ear_tag_image, last_sighting_date, last_latitude, last_longitude
      INTO v_owner, v_city, v_src_imgs, v_src_names,
           v_src_et_img, v_src_date, v_src_lat, v_src_lng
      FROM public.dogs WHERE id = p_dog_id AND deleted_at IS NULL;
    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dog_not_found');
    END IF;
    IF v_owner IS DISTINCT FROM v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
    END IF;

    v_tag := NULLIF(btrim(COALESCE(p_ear_tag_id, '')), '');

    -- Clearing the tag (back to untagged) can never collide.
    IF v_tag IS NULL THEN
        UPDATE public.dogs SET ear_tag_id = NULL WHERE id = p_dog_id;
        RETURN jsonb_build_object('ok', true, 'ear_tag_id', NULL, 'merged', false);
    END IF;

    -- Conflict check mirrors the dogs_city_ear_tag_unique index EXACTLY:
    -- same city (NULL folded to a sentinel), live rows only, another dog.
    SELECT id INTO v_canon
      FROM public.dogs
     WHERE ear_tag_id = v_tag
       AND COALESCE(city_slug, '__none__') = COALESCE(v_city, '__none__')
       AND deleted_at IS NULL
       AND id <> p_dog_id
     LIMIT 1;

    -- No real collision — just set the tag (fixes the old global/soft-deleted
    -- false positives too).
    IF v_canon IS NULL THEN
        UPDATE public.dogs SET ear_tag_id = v_tag WHERE id = p_dog_id;
        RETURN jsonb_build_object('ok', true, 'ear_tag_id', v_tag, 'merged', false);
    END IF;

    -- ---- Merge source (p_dog_id) INTO canonical (v_canon) ----
    -- The tag-holder stays canonical: it keeps its ear_tag_id, its
    -- first_registered_by_id (its Pioneer), and its created_at.

    -- Move every sighting (the caller's and anyone else's) onto canonical.
    UPDATE public.sightings SET dog_id = v_canon WHERE dog_id = p_dog_id;

    -- Fold the duplicate's images / names / freshness into canonical.
    UPDATE public.dogs c SET
        images = COALESCE(c.images, '[]'::jsonb) || COALESCE(v_src_imgs, '[]'::jsonb),
        names = (
            SELECT COALESCE(jsonb_agg(DISTINCT e), '[]'::jsonb)
              FROM jsonb_array_elements(
                     COALESCE(c.names, '[]'::jsonb) || COALESCE(v_src_names, '[]'::jsonb)
                   ) e
        ),
        ear_tag_image = COALESCE(c.ear_tag_image, v_src_et_img),
        last_sighting_date = GREATEST(c.last_sighting_date, v_src_date),
        last_latitude = CASE
            WHEN v_src_date IS NOT NULL
             AND (c.last_sighting_date IS NULL OR v_src_date > c.last_sighting_date)
            THEN v_src_lat ELSE c.last_latitude END,
        last_longitude = CASE
            WHEN v_src_date IS NOT NULL
             AND (c.last_sighting_date IS NULL OR v_src_date > c.last_sighting_date)
            THEN v_src_lng ELSE c.last_longitude END
     WHERE c.id = v_canon;

    -- Move favorites, dropping any that would duplicate an existing favorite.
    DELETE FROM public.favorites f
     WHERE f.dog_id = p_dog_id
       AND EXISTS (SELECT 1 FROM public.favorites f2
                    WHERE f2.user_id = f.user_id AND f2.dog_id = v_canon);
    UPDATE public.favorites SET dog_id = v_canon WHERE dog_id = p_dog_id;

    -- Re-point reports too, so they don't dangle on the retired dog.
    UPDATE public.reports SET dog_id = v_canon WHERE dog_id = p_dog_id;

    -- Retire the duplicate (soft — recoverable by an admin).
    UPDATE public.dogs SET deleted_at = NOW() WHERE id = p_dog_id;

    RETURN jsonb_build_object(
        'ok', true, 'merged', true, 'canonical_dog_id', v_canon
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.update_my_dog_ear_tag(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_my_dog_ear_tag(UUID, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2) Split: re-home ONE of the caller's own sightings onto the correct tag.
--    Fixes a mistyped tag that wrongly attached the sighting to another dog.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.correct_my_sighting_tag(
    p_sighting_id  UUID,
    p_ear_tag_id   TEXT
) RETURNS JSONB AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_src_dog   UUID;
    v_lat       DOUBLE PRECISION;
    v_lng       DOUBLE PRECISION;
    v_img       TEXT;
    v_et_img    TEXT;
    v_char      public.dog_character;
    v_size      INTEGER;
    v_gender    public.dog_gender;
    v_age       public.dog_age;
    v_ts        TIMESTAMPTZ;
    v_city      TEXT;
    v_tag       TEXT;
    v_target    UUID;
    v_new_dog   UUID;
    v_created   BOOLEAN := false;
    v_remaining INTEGER;
    v_src_owner UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    -- Load the caller's own, live sighting.
    SELECT dog_id, latitude, longitude, image_url, ear_tag_image_url,
           character, size, gender, age, timestamp
      INTO v_src_dog, v_lat, v_lng, v_img, v_et_img,
           v_char, v_size, v_gender, v_age, v_ts
      FROM public.sightings
     WHERE id = p_sighting_id AND user_id = v_uid AND deleted_at IS NULL;
    IF v_src_dog IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    v_tag  := NULLIF(btrim(COALESCE(p_ear_tag_id, '')), '');
    v_city := public.derive_city_slug(v_lat, v_lng);

    -- A matching live dog in this city (excluding the one we're leaving).
    IF v_tag IS NOT NULL THEN
        SELECT id INTO v_target
          FROM public.dogs
         WHERE ear_tag_id = v_tag
           AND COALESCE(city_slug, '__none__') = COALESCE(v_city, '__none__')
           AND deleted_at IS NULL
           AND id <> v_src_dog
         LIMIT 1;
    END IF;

    -- Already on a dog with this exact tag → nothing to do.
    IF v_tag IS NOT NULL AND v_target IS NULL THEN
        PERFORM 1 FROM public.dogs
          WHERE id = v_src_dog AND ear_tag_id = v_tag AND deleted_at IS NULL;
        IF FOUND THEN
            RETURN jsonb_build_object('ok', true, 'dog_id', v_src_dog,
                                      'created_new', false, 'unchanged', true);
        END IF;
    END IF;

    IF v_target IS NOT NULL THEN
        -- Re-point onto the correct existing dog and refresh its freshness.
        v_new_dog := v_target;
        UPDATE public.dogs c SET
            images = CASE
                WHEN v_img IS NULL OR COALESCE(c.images,'[]'::jsonb) @> to_jsonb(v_img)
                THEN c.images
                ELSE COALESCE(c.images, '[]'::jsonb) || jsonb_build_array(v_img) END,
            ear_tag_image = COALESCE(c.ear_tag_image, v_et_img),
            last_sighting_date = GREATEST(c.last_sighting_date, v_ts),
            last_latitude = CASE WHEN c.last_sighting_date IS NULL OR v_ts > c.last_sighting_date
                                 THEN v_lat ELSE c.last_latitude END,
            last_longitude = CASE WHEN c.last_sighting_date IS NULL OR v_ts > c.last_sighting_date
                                  THEN v_lng ELSE c.last_longitude END
         WHERE c.id = v_target;
    ELSE
        -- No dog with this tag (or tag blank) → spin out a NEW dog from the
        -- sighting. This is the split: the entry becomes its own dog again.
        INSERT INTO public.dogs (
            ear_tag_id, names, images, ear_tag_image,
            last_latitude, last_longitude, last_sighting_date, city_slug,
            character, size, gender, age, first_registered_by_id, status
        ) VALUES (
            v_tag, '[]'::jsonb,
            CASE WHEN v_img IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(v_img) END,
            v_et_img, v_lat, v_lng, v_ts, v_city,
            v_char, v_size, v_gender, v_age, v_uid, 'approved'
        ) RETURNING id INTO v_new_dog;
        v_created := true;
    END IF;

    -- Move the sighting.
    UPDATE public.sightings SET dog_id = v_new_dog WHERE id = p_sighting_id;

    -- Pull this sighting's photo off the dog we left.
    IF v_img IS NOT NULL THEN
        UPDATE public.dogs d SET images = (
            SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
              FROM jsonb_array_elements(COALESCE(d.images, '[]'::jsonb)) e
             WHERE e <> to_jsonb(v_img)
        ) WHERE d.id = v_src_dog;
    END IF;

    -- If the dog we left is now empty AND was the caller's own, retire it
    -- (soft). Never touches a dog that still holds other people's sightings.
    SELECT COUNT(*) INTO v_remaining
      FROM public.sightings WHERE dog_id = v_src_dog AND deleted_at IS NULL;
    SELECT first_registered_by_id INTO v_src_owner
      FROM public.dogs WHERE id = v_src_dog;
    IF v_remaining = 0 AND v_src_owner = v_uid THEN
        UPDATE public.dogs SET deleted_at = NOW() WHERE id = v_src_dog;
    END IF;

    RETURN jsonb_build_object('ok', true, 'dog_id', v_new_dog,
                              'created_new', v_created);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.correct_my_sighting_tag(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.correct_my_sighting_tag(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
