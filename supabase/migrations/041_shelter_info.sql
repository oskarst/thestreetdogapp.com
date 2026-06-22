-- ============================================================================
-- Shelter info text.
--
-- When a dog is marked as living in a shelter, the reporter can add free-text
-- shelter info (name, address, contact). It is:
--   - stored on the dog (dogs.shelter_info), and
--   - remembered on the reporter's profile (profiles.shelter_info) so the
--     Add-Dog form can prepopulate it next time they tick the shelter box.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shelter_info TEXT;
ALTER TABLE public.dogs     ADD COLUMN IF NOT EXISTS shelter_info TEXT;

NOTIFY pgrst, 'reload schema';
