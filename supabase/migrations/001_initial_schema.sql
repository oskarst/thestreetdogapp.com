-- ============================================================================
-- Street Dog App - Initial Schema Migration
-- Supabase (PostgreSQL) with Row Level Security
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('user', 'rescuer', 'admin');
CREATE TYPE public.report_type AS ENUM ('issue', 'health', 'feedback', 'other');
CREATE TYPE public.report_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE public.dog_character AS ENUM ('friendly', 'very_friendly', 'indifferent', 'sleeping', 'afraid', 'aggressive');
CREATE TYPE public.dog_gender AS ENUM ('male', 'female', 'unknown');
CREATE TYPE public.dog_age AS ENUM ('puppy', 'young', 'adult', 'old');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    nickname    TEXT,
    role        public.user_role NOT NULL DEFAULT 'user',
    is_banned   BOOLEAN NOT NULL DEFAULT false,
    ocr_usage_count INTEGER NOT NULL DEFAULT 0,
    last_activity   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- dogs
CREATE TABLE public.dogs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ear_tag_id              TEXT UNIQUE,
    names                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    images                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    ear_tag_image           TEXT,
    last_latitude           DOUBLE PRECISION,
    last_longitude          DOUBLE PRECISION,
    last_sighting_date      TIMESTAMPTZ,
    character               public.dog_character,
    size                    INTEGER CHECK (size >= 1 AND size <= 10),
    gender                  public.dog_gender,
    age                     public.dog_age,
    first_registered_by_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sightings
CREATE TABLE public.sightings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dog_id              UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    character           public.dog_character NOT NULL,
    size                INTEGER NOT NULL CHECK (size >= 1 AND size <= 10),
    gender              public.dog_gender NOT NULL,
    age                 public.dog_age NOT NULL,
    notes               TEXT,
    image_url           TEXT,
    ear_tag_image_url   TEXT,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- favorites
CREATE TABLE public.favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dog_id      UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, dog_id)
);

-- reports
CREATE TABLE public.reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dog_id      UUID REFERENCES public.dogs(id) ON DELETE SET NULL,
    report_type public.report_type NOT NULL,
    message     TEXT NOT NULL,
    status      public.report_status NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- profiles
CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_role ON public.profiles (role);

-- dogs
CREATE INDEX idx_dogs_ear_tag_id ON public.dogs (ear_tag_id);
CREATE INDEX idx_dogs_first_registered_by_id ON public.dogs (first_registered_by_id);
CREATE INDEX idx_dogs_created_at ON public.dogs (created_at);
CREATE INDEX idx_dogs_last_sighting_date ON public.dogs (last_sighting_date);

-- sightings
CREATE INDEX idx_sightings_user_id ON public.sightings (user_id);
CREATE INDEX idx_sightings_dog_id ON public.sightings (dog_id);
CREATE INDEX idx_sightings_user_dog ON public.sightings (user_id, dog_id);
CREATE INDEX idx_sightings_timestamp ON public.sightings (timestamp);

-- favorites
CREATE INDEX idx_favorites_user_id ON public.favorites (user_id);
CREATE INDEX idx_favorites_dog_id ON public.favorites (dog_id);

-- reports
CREATE INDEX idx_reports_user_id ON public.reports (user_id);
CREATE INDEX idx_reports_dog_id ON public.reports (dog_id);
CREATE INDEX idx_reports_status ON public.reports (status);
CREATE INDEX idx_reports_created_at ON public.reports (created_at);

-- ============================================================================
-- 4. UPDATED_AT TRIGGER FUNCTION + TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_dogs_updated_at
    BEFORE UPDATE ON public.dogs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports   ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_banned()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_banned = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -------------------------
-- profiles policies
-- -------------------------

-- Authenticated users can read all profiles
CREATE POLICY profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY profiles_update_admin ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -------------------------
-- dogs policies
-- -------------------------

-- Authenticated users can read all dogs
CREATE POLICY dogs_select ON public.dogs
    FOR SELECT TO authenticated
    USING (true);

-- Non-banned authenticated users can insert dogs
CREATE POLICY dogs_insert ON public.dogs
    FOR INSERT TO authenticated
    WITH CHECK (NOT public.is_banned());

-- Non-banned authenticated users can update dogs
CREATE POLICY dogs_update ON public.dogs
    FOR UPDATE TO authenticated
    USING (NOT public.is_banned())
    WITH CHECK (NOT public.is_banned());

-- Only admins can delete dogs
CREATE POLICY dogs_delete ON public.dogs
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- -------------------------
-- sightings policies
-- -------------------------

-- Authenticated users can read all sightings
CREATE POLICY sightings_select ON public.sightings
    FOR SELECT TO authenticated
    USING (true);

-- Non-banned users can insert their own sightings
CREATE POLICY sightings_insert ON public.sightings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND NOT public.is_banned());

-- Admins can update any sighting
CREATE POLICY sightings_update_admin ON public.sightings
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete any sighting
CREATE POLICY sightings_delete_admin ON public.sightings
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- -------------------------
-- favorites policies
-- -------------------------

-- Users can read their own favorites
CREATE POLICY favorites_select ON public.favorites
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own favorites
CREATE POLICY favorites_insert ON public.favorites
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own favorites
CREATE POLICY favorites_delete ON public.favorites
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- -------------------------
-- reports policies
-- -------------------------

-- Users can read their own reports
CREATE POLICY reports_select_own ON public.reports
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can read all reports
CREATE POLICY reports_select_admin ON public.reports
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Users can insert their own reports
CREATE POLICY reports_insert ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins can update any report
CREATE POLICY reports_update_admin ON public.reports
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- 6. AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. SCORING RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_score(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_new_dogs      INTEGER;
    v_unique_dogs   INTEGER;
    v_total_catches INTEGER;
    v_total_score   INTEGER;
BEGIN
    -- Count dogs first registered by this user (10 pts each)
    SELECT COUNT(*)
      INTO v_new_dogs
      FROM public.dogs
     WHERE first_registered_by_id = p_user_id;

    -- Count distinct dogs sighted by this user (5 pts each)
    SELECT COUNT(DISTINCT dog_id)
      INTO v_unique_dogs
      FROM public.sightings
     WHERE user_id = p_user_id;

    -- Count total sightings by this user (1 pt each)
    SELECT COUNT(*)
      INTO v_total_catches
      FROM public.sightings
     WHERE user_id = p_user_id;

    -- Calculate total score
    v_total_score := (v_new_dogs * 10) + (v_unique_dogs * 5) + (v_total_catches * 1);

    RETURN jsonb_build_object(
        'new_dogs',             v_new_dogs,
        'new_dogs_points',      v_new_dogs * 10,
        'unique_dogs',          v_unique_dogs,
        'unique_dogs_points',   v_unique_dogs * 5,
        'total_catches',        v_total_catches,
        'total_catches_points', v_total_catches * 1,
        'total_score',          v_total_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 8. STORAGE BUCKETS (configure in Supabase Dashboard)
-- ============================================================================
-- CREATE BUCKET 'dogs' (public read, auth write, 10MB max, image/*)
-- CREATE BUCKET 'ear-tags' (public read, auth write, 5MB max, image/*)

-- ============================================================================
-- 9. CRON JOB: Reset OCR usage daily (requires pg_cron extension)
-- ============================================================================
-- SELECT cron.schedule('reset-ocr-usage', '0 0 * * *', 'UPDATE profiles SET ocr_usage_count = 0 WHERE ocr_usage_count > 0');
