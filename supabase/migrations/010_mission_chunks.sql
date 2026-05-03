-- ============================================================================
-- Mission v3: subdivide each raion into ~2.5 km square chunks.
--
-- The 10 raions are too big to walk in one mission run, so missions move to
-- a finer granularity. Each chunk is 2.5 km × 2.5 km (assigned to the
-- raion whose polygon contains the cell centroid). Total: 81 chunks across
-- the 10 raions, each colour-tagged by parent raion in the UI.
--
-- The slug format is "<raion>-<index>", e.g. "saburtalo-3". RPCs that take
-- p_slug TEXT (start_mission, claim_district_mission, award_mission_progress)
-- keep working unchanged — they were already slug-based.
--
-- This migration WIPES existing mission state. The feature is brand new and
-- changing the slug semantics underneath would leave dangling references.
-- ============================================================================

-- 1) Wipe in-flight mission state and history (fresh start for the chunk model)
DELETE FROM public.mission_dog_credits;
DELETE FROM public.mission_completions;
UPDATE public.profiles
   SET active_mission_slug = NULL,
       active_mission_started_at = NULL,
       active_mission_distinct_count = 0,
       active_mission_awards_today = 0,
       active_mission_award_date = NULL;

-- 2) Reshape mission_districts as the chunks table
ALTER TABLE public.mission_districts
    ADD COLUMN IF NOT EXISTS parent_slug TEXT,
    ADD COLUMN IF NOT EXISTS color_index INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 1;

DELETE FROM public.mission_districts;

INSERT INTO public.mission_districts
    (slug, name_en, parent_slug, color_index, chunk_index, reward_xp)
VALUES
    ('chugureti-1', 'Chugureti 1', 'chugureti', 0, 1, 50),
    ('chugureti-2', 'Chugureti 2', 'chugureti', 0, 2, 50),
    ('didube-1', 'Didube 1', 'didube', 1, 1, 50),
    ('gldani-1', 'Gldani 1', 'gldani', 2, 1, 50),
    ('gldani-2', 'Gldani 2', 'gldani', 2, 2, 50),
    ('gldani-3', 'Gldani 3', 'gldani', 2, 3, 50),
    ('gldani-4', 'Gldani 4', 'gldani', 2, 4, 50),
    ('gldani-5', 'Gldani 5', 'gldani', 2, 5, 50),
    ('gldani-6', 'Gldani 6', 'gldani', 2, 6, 50),
    ('gldani-7', 'Gldani 7', 'gldani', 2, 7, 50),
    ('gldani-8', 'Gldani 8', 'gldani', 2, 8, 50),
    ('gldani-9', 'Gldani 9', 'gldani', 2, 9, 50),
    ('isani-1', 'Isani 1', 'isani', 3, 1, 50),
    ('isani-2', 'Isani 2', 'isani', 3, 2, 50),
    ('isani-3', 'Isani 3', 'isani', 3, 3, 50),
    ('krtsanisi-1', 'Krtsanisi 1', 'krtsanisi', 4, 1, 50),
    ('krtsanisi-2', 'Krtsanisi 2', 'krtsanisi', 4, 2, 50),
    ('krtsanisi-3', 'Krtsanisi 3', 'krtsanisi', 4, 3, 50),
    ('krtsanisi-4', 'Krtsanisi 4', 'krtsanisi', 4, 4, 50),
    ('krtsanisi-5', 'Krtsanisi 5', 'krtsanisi', 4, 5, 50),
    ('krtsanisi-6', 'Krtsanisi 6', 'krtsanisi', 4, 6, 50),
    ('krtsanisi-7', 'Krtsanisi 7', 'krtsanisi', 4, 7, 50),
    ('mtatsminda-1', 'Mtatsminda 1', 'mtatsminda', 5, 1, 50),
    ('mtatsminda-2', 'Mtatsminda 2', 'mtatsminda', 5, 2, 50),
    ('mtatsminda-3', 'Mtatsminda 3', 'mtatsminda', 5, 3, 50),
    ('mtatsminda-4', 'Mtatsminda 4', 'mtatsminda', 5, 4, 50),
    ('mtatsminda-5', 'Mtatsminda 5', 'mtatsminda', 5, 5, 50),
    ('mtatsminda-6', 'Mtatsminda 6', 'mtatsminda', 5, 6, 50),
    ('mtatsminda-7', 'Mtatsminda 7', 'mtatsminda', 5, 7, 50),
    ('mtatsminda-8', 'Mtatsminda 8', 'mtatsminda', 5, 8, 50),
    ('mtatsminda-9', 'Mtatsminda 9', 'mtatsminda', 5, 9, 50),
    ('mtatsminda-10', 'Mtatsminda 10', 'mtatsminda', 5, 10, 50),
    ('nadzaladevi-1', 'Nadzaladevi 1', 'nadzaladevi', 6, 1, 50),
    ('nadzaladevi-2', 'Nadzaladevi 2', 'nadzaladevi', 6, 2, 50),
    ('nadzaladevi-3', 'Nadzaladevi 3', 'nadzaladevi', 6, 3, 50),
    ('nadzaladevi-4', 'Nadzaladevi 4', 'nadzaladevi', 6, 4, 50),
    ('nadzaladevi-5', 'Nadzaladevi 5', 'nadzaladevi', 6, 5, 50),
    ('saburtalo-1', 'Saburtalo 1', 'saburtalo', 7, 1, 50),
    ('saburtalo-2', 'Saburtalo 2', 'saburtalo', 7, 2, 50),
    ('saburtalo-3', 'Saburtalo 3', 'saburtalo', 7, 3, 50),
    ('saburtalo-4', 'Saburtalo 4', 'saburtalo', 7, 4, 50),
    ('saburtalo-5', 'Saburtalo 5', 'saburtalo', 7, 5, 50),
    ('saburtalo-6', 'Saburtalo 6', 'saburtalo', 7, 6, 50),
    ('saburtalo-7', 'Saburtalo 7', 'saburtalo', 7, 7, 50),
    ('saburtalo-8', 'Saburtalo 8', 'saburtalo', 7, 8, 50),
    ('saburtalo-9', 'Saburtalo 9', 'saburtalo', 7, 9, 50),
    ('saburtalo-10', 'Saburtalo 10', 'saburtalo', 7, 10, 50),
    ('saburtalo-11', 'Saburtalo 11', 'saburtalo', 7, 11, 50),
    ('saburtalo-12', 'Saburtalo 12', 'saburtalo', 7, 12, 50),
    ('saburtalo-13', 'Saburtalo 13', 'saburtalo', 7, 13, 50),
    ('samgori-1', 'Samgori 1', 'samgori', 8, 1, 50),
    ('samgori-2', 'Samgori 2', 'samgori', 8, 2, 50),
    ('samgori-3', 'Samgori 3', 'samgori', 8, 3, 50),
    ('samgori-4', 'Samgori 4', 'samgori', 8, 4, 50),
    ('samgori-5', 'Samgori 5', 'samgori', 8, 5, 50),
    ('samgori-6', 'Samgori 6', 'samgori', 8, 6, 50),
    ('samgori-7', 'Samgori 7', 'samgori', 8, 7, 50),
    ('samgori-8', 'Samgori 8', 'samgori', 8, 8, 50),
    ('samgori-9', 'Samgori 9', 'samgori', 8, 9, 50),
    ('samgori-10', 'Samgori 10', 'samgori', 8, 10, 50),
    ('samgori-11', 'Samgori 11', 'samgori', 8, 11, 50),
    ('samgori-12', 'Samgori 12', 'samgori', 8, 12, 50),
    ('samgori-13', 'Samgori 13', 'samgori', 8, 13, 50),
    ('samgori-14', 'Samgori 14', 'samgori', 8, 14, 50),
    ('samgori-15', 'Samgori 15', 'samgori', 8, 15, 50),
    ('samgori-16', 'Samgori 16', 'samgori', 8, 16, 50),
    ('samgori-17', 'Samgori 17', 'samgori', 8, 17, 50),
    ('samgori-18', 'Samgori 18', 'samgori', 8, 18, 50),
    ('samgori-19', 'Samgori 19', 'samgori', 8, 19, 50),
    ('samgori-20', 'Samgori 20', 'samgori', 8, 20, 50),
    ('vake-1', 'Vake 1', 'vake', 9, 1, 50),
    ('vake-2', 'Vake 2', 'vake', 9, 2, 50),
    ('vake-3', 'Vake 3', 'vake', 9, 3, 50),
    ('vake-4', 'Vake 4', 'vake', 9, 4, 50),
    ('vake-5', 'Vake 5', 'vake', 9, 5, 50),
    ('vake-6', 'Vake 6', 'vake', 9, 6, 50),
    ('vake-7', 'Vake 7', 'vake', 9, 7, 50),
    ('vake-8', 'Vake 8', 'vake', 9, 8, 50),
    ('vake-9', 'Vake 9', 'vake', 9, 9, 50),
    ('vake-10', 'Vake 10', 'vake', 9, 10, 50),
    ('vake-11', 'Vake 11', 'vake', 9, 11, 50);
