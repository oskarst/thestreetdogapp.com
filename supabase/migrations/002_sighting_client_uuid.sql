-- Idempotency for offline-sync replay.
-- Clients generate a UUID at offline-save time and resend it on every replay,
-- so the SW background-sync and a manual "Sync Now" tap can't double-post.

ALTER TABLE public.sightings
    ADD COLUMN client_uuid UUID;

CREATE UNIQUE INDEX idx_sightings_user_client_uuid
    ON public.sightings (user_id, client_uuid)
    WHERE client_uuid IS NOT NULL;
