# Public dataset export to BigQuery

Nightly, the app exports a **PII-free** snapshot of the dog/sighting data to
BigQuery, where it can be shared as a public open dataset.

## What's exported

Two curated views (migration `039_analytics_views.sql`), never the raw tables:

- `analytics_dogs` — approved, non-deleted dogs: id, ear tag, city, traits,
  last location, first/last seen, `contributor_hash`.
- `analytics_sightings` — sightings of approved dogs: id, dog_id, city, lat/lng,
  timestamp, traits, `health_flag`, `contributor_hash`.

No emails, no raw user ids. The contributor is reduced to `md5(user_id)` — a
stable pseudonym for "distinct contributors" stats that can't be reversed.

## Pipeline

`Supabase views → /api/cron/export-bigquery → BigQuery (WRITE_TRUNCATE)`

- Vercel Cron runs `GET /api/cron/export-bigquery` daily at 03:00 UTC
  (`vercel.json`).
- The route pages through each view (service-role) and loads it into BigQuery
  as a full-refresh snapshot (`src/lib/bigquery.ts`).
- It's **inert** until the env vars below are set (returns `{ skipped: true }`).

## One-time setup

1. **Run the migration** `039_analytics_views.sql` in Supabase.
2. **GCP**: create a project + a BigQuery dataset (e.g. `streetdog_public`).
3. **Service account** with `BigQuery Data Editor` + `BigQuery Job User`;
   download its JSON key and base64-encode it:
   `base64 -i key.json | tr -d '\n'`
4. **Vercel env vars** (Production):
   - `GCP_PROJECT_ID`
   - `BIGQUERY_DATASET` (e.g. `streetdog_public`)
   - `BIGQUERY_LOCATION` (e.g. `US` or `EU`)
   - `GOOGLE_SERVICE_ACCOUNT_KEY` (the base64 string)
   - `CRON_SECRET` (Vercel sends it as `Authorization: Bearer …`; the route
     rejects calls without it)
5. **Make it public**: in BigQuery, share the dataset with principal `allUsers`
   (or `allAuthenticatedUsers`) as `BigQuery Data Viewer`. Add a dataset
   description + a license (e.g. CC-BY-4.0).

## Run it manually

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/cron/export-bigquery
# -> { "ok": true, "loaded": { "dogs": N, "sightings": M } }
```

## Direct downloads (no BigQuery needed)

The same anonymized views are downloadable straight from the app — no GCP — for
people who just want the data. Public, CDN-cached (~1h):

- `GET /api/public/dataset/dogs` — GeoJSON (default)
- `GET /api/public/dataset/dogs?format=csv`
- `GET /api/public/dataset/dogs?format=json`
- `GET /api/public/dataset/sightings` (same `format` options)

GeoJSON emits `Point` features from the coordinates; all other fields go in
`properties`. Requires migration `039_analytics_views.sql` to be applied.

## Notes

- Full refresh each run (snapshot), so deletions/edits propagate. Switch to
  partition + incremental later if volume grows.
- Coordinates are exported exactly (street dogs, not people). Round in the views
  if you ever want to coarsen them.
