-- ============================================================================
-- Optional district missions: spot all the dogs in one of Tbilisi's 10 raions
-- to claim +50 XP. Polygons live in /public/tbilisi-districts.geojson and the
-- point-in-polygon test runs client-side; the server just records claims.
--
-- Trust model: the claim RPC verifies every dog_id the client submits is
-- actually sighted by the calling user (via the existing sightings table) and
-- ignores ones that aren't. It does *not* re-validate that the dog falls
-- inside the requested raion — that's a self-cheating vector at worst, and
-- v1 keeps SQL light by trusting the client polygon check.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mission_districts (
    slug TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    reward_xp INTEGER NOT NULL DEFAULT 50
);

INSERT INTO public.mission_districts (slug, name_en) VALUES
    ('chugureti',   'Chugureti'),
    ('didube',      'Didube'),
    ('gldani',      'Gldani'),
    ('isani',       'Isani'),
    ('krtsanisi',   'Krtsanisi'),
    ('mtatsminda',  'Mtatsminda'),
    ('nadzaladevi', 'Nadzaladevi'),
    ('saburtalo',   'Saburtalo'),
    ('samgori',     'Samgori'),
    ('vake',        'Vake')
ON CONFLICT (slug) DO NOTHING;

GRANT SELECT ON public.mission_districts TO authenticated;

CREATE TABLE IF NOT EXISTS public.mission_completions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    district_slug TEXT NOT NULL REFERENCES public.mission_districts(slug),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dogs_at_completion INTEGER NOT NULL,
    PRIMARY KEY (user_id, district_slug)
);

ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;

-- A user can read their own completions; writes go through the RPC.
DROP POLICY IF EXISTS mission_completions_select_own ON public.mission_completions;
CREATE POLICY mission_completions_select_own
    ON public.mission_completions
    FOR SELECT
    USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.mission_completions FROM authenticated;
GRANT SELECT ON public.mission_completions TO authenticated;

-- ---------------------------------------------------------------------------
-- claim_district_mission: atomic completion + XP award
-- ---------------------------------------------------------------------------
-- Verifies that every dog_id passed by the client is actually sighted by the
-- caller (so a user can't claim XP for sightings they don't own), inserts the
-- completion row (idempotent — second call is a no-op), and bumps
-- profiles.quest_bonus_total by the district's reward_xp.
--
-- Returns: { ok: bool, awarded: int, dogs_counted: int, error?: text }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_district_mission(
    p_slug TEXT,
    p_dog_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
    v_user_id        UUID := auth.uid();
    v_already        BOOLEAN;
    v_reward         INTEGER;
    v_verified_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT reward_xp INTO v_reward
      FROM public.mission_districts
     WHERE slug = p_slug;
    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unknown_district');
    END IF;

    -- Already claimed? Idempotent return.
    SELECT TRUE INTO v_already
      FROM public.mission_completions
     WHERE user_id = v_user_id AND district_slug = p_slug;
    IF v_already THEN
        RETURN jsonb_build_object('ok', true, 'awarded', 0, 'already_claimed', true);
    END IF;

    -- Verify the user has indeed sighted each submitted dog. Distinct dogs only.
    SELECT COUNT(DISTINCT s.dog_id) INTO v_verified_count
      FROM public.sightings s
     WHERE s.user_id = v_user_id
       AND s.dog_id = ANY(p_dog_ids);

    IF v_verified_count = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_qualifying_sightings');
    END IF;

    INSERT INTO public.mission_completions (user_id, district_slug, dogs_at_completion)
        VALUES (v_user_id, p_slug, v_verified_count);

    UPDATE public.profiles
       SET quest_bonus_total = COALESCE(quest_bonus_total, 0) + v_reward
     WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'ok', true,
        'awarded', v_reward,
        'dogs_counted', v_verified_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_district_mission(TEXT, UUID[]) TO authenticated;

-- Lightweight read RPC the dashboard / missions page can call to get the
-- current user's claimed slugs without exposing the table to direct queries.
CREATE OR REPLACE FUNCTION public.get_my_mission_completions()
RETURNS TABLE (
    district_slug TEXT,
    completed_at TIMESTAMPTZ,
    dogs_at_completion INTEGER
) AS $$
    SELECT district_slug, completed_at, dogs_at_completion
      FROM public.mission_completions
     WHERE user_id = auth.uid()
     ORDER BY completed_at DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_mission_completions() TO authenticated;
