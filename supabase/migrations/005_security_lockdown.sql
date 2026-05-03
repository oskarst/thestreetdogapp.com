-- ============================================================================
-- Security lockdown — fixes the 3 CRITICAL findings from the audit:
--
--   1. profiles_update_own let any user UPDATE their own row including the
--      `role` column → trivial self-promotion to admin.
--   2. profiles_select USING(true) + sightings_select USING(true) exposed
--      every user's email, plus user_id↔location correlation across all
--      sightings → mass scrape of who walks where in Tbilisi.
--   3. get_user_score(p_user_id) trusted the parameter and was SECURITY
--      DEFINER → cross-user score / activity oracle.
--
-- Approach: column-level grants (postgres native, simpler than per-column
-- RLS), plus SECURITY DEFINER RPCs for the cases where the app legitimately
-- needs richer data (own profile, sighting list with nickname).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles: column-level UPDATE + SELECT
-- ---------------------------------------------------------------------------

-- Only `nickname` is self-updatable. Privileged columns (role, is_banned,
-- email, quest_*, ocr_usage_count) move via SECURITY DEFINER RPCs only,
-- or via the admin client (service role).
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname) ON public.profiles TO authenticated;

-- Public-readable profile columns. `email` is NOT granted — emails
-- become self-only via the get_my_profile() RPC below.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
    id, nickname, role, last_activity, created_at, updated_at,
    quest_last_claimed_date
) ON public.profiles TO authenticated;
-- Withheld from authenticated client: email, is_banned, ocr_usage_count, quest_bonus_total.

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles AS $$
    SELECT * FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. sightings: hide user_id correlation
-- ---------------------------------------------------------------------------

-- The privacy harm is the (user_id, latitude, longitude, timestamp) join,
-- which gives a daily-walk map per user. Drop user_id from public reads;
-- the dog detail page gets nickname + an `is_mine` flag via RPC instead.
REVOKE SELECT ON public.sightings FROM authenticated;
GRANT SELECT (
    id, dog_id, latitude, longitude, character, size, gender, age,
    notes, image_url, ear_tag_image_url, timestamp, client_uuid
) ON public.sightings TO authenticated;
-- user_id withheld.

-- For the dog detail page: returns sightings + nickname of the spotter +
-- an `is_mine` flag, but NOT the raw user_id. That preserves the UI
-- without re-enabling cross-user correlation client-side.
CREATE OR REPLACE FUNCTION public.get_dog_sightings(
    p_dog_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    dog_id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    "character" public.dog_character,
    size INTEGER,
    gender public.dog_gender,
    age public.dog_age,
    notes TEXT,
    image_url TEXT,
    ear_tag_image_url TEXT,
    "timestamp" TIMESTAMPTZ,
    nickname TEXT,
    is_mine BOOLEAN
) AS $$
    SELECT s.id, s.dog_id, s.latitude, s.longitude,
           s.character, s.size, s.gender, s.age, s.notes,
           s.image_url, s.ear_tag_image_url, s.timestamp,
           p.nickname,
           (s.user_id = auth.uid()) AS is_mine
    FROM public.sightings s
    LEFT JOIN public.profiles p ON p.id = s.user_id
    WHERE s.dog_id = p_dog_id
    ORDER BY s.timestamp DESC
    LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.get_dog_sightings(UUID, INTEGER) TO authenticated;

-- Distinct-catcher count for the stats grid on the dog detail page.
CREATE OR REPLACE FUNCTION public.count_dog_catchers(p_dog_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(DISTINCT user_id)::INTEGER
    FROM public.sightings WHERE dog_id = p_dog_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.count_dog_catchers(UUID) TO authenticated;

-- "Did the calling user spot this dog" — replaces the count-head probe in
-- /api/dogs/[id]/name (which used .eq("user_id", auth.uid()) and now needs
-- the user_id column). Single boolean, no PII leak.
CREATE OR REPLACE FUNCTION public.has_user_spotted_dog(p_dog_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.sightings
         WHERE dog_id = p_dog_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.has_user_spotted_dog(UUID) TO authenticated;

-- Self's own sightings, full row (replaces direct .from("sightings") query).
CREATE OR REPLACE FUNCTION public.get_my_sightings()
RETURNS SETOF public.sightings AS $$
    SELECT * FROM public.sightings
     WHERE user_id = auth.uid()
     ORDER BY timestamp DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.get_my_sightings() TO authenticated;

-- Slim variant for gallery's "I caught these dogs" set.
CREATE OR REPLACE FUNCTION public.get_my_caught_dog_ids()
RETURNS TABLE (dog_id UUID) AS $$
    SELECT DISTINCT dog_id FROM public.sightings WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.get_my_caught_dog_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_user_score(p_user_id) → require auth.uid() match or admin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_score(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_new_dogs            INTEGER;
    v_unique_dogs         INTEGER;
    v_total_catches       INTEGER;
    v_capped_catches      INTEGER;
    v_ear_tag_count       INTEGER;
    v_quest_bonus         INTEGER;
    v_total_score         INTEGER;
BEGIN
    -- Refuse to compute another user's score unless caller is admin.
    IF p_user_id <> auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*) INTO v_new_dogs
      FROM public.dogs
     WHERE first_registered_by_id = p_user_id;

    SELECT COUNT(DISTINCT dog_id) INTO v_unique_dogs
      FROM public.sightings
     WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_total_catches
      FROM public.sightings
     WHERE user_id = p_user_id;

    SELECT COALESCE(SUM(LEAST(daily_count, 5)), 0)::INTEGER INTO v_capped_catches
      FROM (
        SELECT COUNT(*) AS daily_count
          FROM public.sightings
         WHERE user_id = p_user_id
         GROUP BY dog_id, DATE(timestamp)
      ) per_day;

    SELECT COUNT(*) INTO v_ear_tag_count
      FROM public.sightings
     WHERE user_id = p_user_id
       AND ear_tag_image_url IS NOT NULL;

    SELECT COALESCE(quest_bonus_total, 0) INTO v_quest_bonus
      FROM public.profiles
     WHERE id = p_user_id;

    v_total_score := (v_new_dogs * 10)
                   + (v_unique_dogs * 5)
                   + (v_capped_catches * 1)
                   + (v_ear_tag_count * 2)
                   + v_quest_bonus;

    RETURN jsonb_build_object(
        'new_dogs',                v_new_dogs,
        'new_dogs_points',         v_new_dogs * 10,
        'unique_dogs',             v_unique_dogs,
        'unique_dogs_points',      v_unique_dogs * 5,
        'total_catches',           v_total_catches,
        'total_catches_points',    v_capped_catches,
        'ear_tag_bonus_count',     v_ear_tag_count,
        'ear_tag_bonus_points',    v_ear_tag_count * 2,
        'quest_bonus_points',      v_quest_bonus,
        'total_score',             v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
