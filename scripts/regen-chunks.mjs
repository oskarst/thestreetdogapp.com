// Regenerate tbilisi-chunks.geojson + matching mission_districts INSERTs at
// 1.25 km cells (2× the previous 0.625 km). Tiles each raion polygon with a
// grid aligned to the existing origin (44.6, 41.62252) so the new cells are
// supersets of the old ones (every new cell is exactly four old cells).
//
// Usage: node scripts/regen-chunks.mjs
//   Writes:  public/tbilisi-chunks.geojson           (overwritten)
//            supabase/migrations/014_mission_chunks_resize.sql (overwritten)
//
// Run this when you want to change the chunk size again — it produces a
// standalone migration that wipes + re-seeds mission_districts at the new
// grid. The combined 013_dashboard_v5.sql already covers the current size.
//
// Algorithm: for each raion, walk every grid cell that intersects the
// bounding box; keep the cell when its centroid falls inside the polygon.
// Same approach as the v3.1 cells, just with 2× the step.
//
// Color index is assigned alphabetically by raion slug (matches existing
// PARENT_COLORS palette in src/lib/missions.ts).

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DISTRICTS = path.join(ROOT, "public", "tbilisi-districts.geojson");
const OUT_GEOJSON = path.join(ROOT, "public", "tbilisi-chunks.geojson");
const OUT_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "014_mission_chunks_resize.sql",
);

// Grid origin: matches the existing geojson so old cells are subsumed.
const ORIGIN_LON = 44.6;
const ORIGIN_LAT = 41.62252;
// Cell size: 2× the previous 0.00754 / 0.00563 (≈ 1.25 km at lat 41.7).
const CELL_LON = 0.01508;
const CELL_LAT = 0.01126;

const REWARD_XP = 50;

function pointInRing(lon, lat, ring) {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function bboxOf(ring) {
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

const raw = JSON.parse(readFileSync(DISTRICTS, "utf8"));
const raions = [...raw.features].sort((a, b) =>
  a.properties.slug.localeCompare(b.properties.slug),
);

const features = [];
const sqlRows = [];

for (let colorIndex = 0; colorIndex < raions.length; colorIndex++) {
  const raion = raions[colorIndex];
  const ring = raion.geometry.coordinates[0];
  const [minLon, minLat, maxLon, maxLat] = bboxOf(ring);

  // Snap the bbox onto the grid.
  const iStart = Math.floor((minLon - ORIGIN_LON) / CELL_LON);
  const iEnd = Math.ceil((maxLon - ORIGIN_LON) / CELL_LON);
  const jStart = Math.floor((minLat - ORIGIN_LAT) / CELL_LAT);
  const jEnd = Math.ceil((maxLat - ORIGIN_LAT) / CELL_LAT);

  // Sort cells row-major (j ascending, then i ascending) so chunk numbers
  // grow predictably south-to-north, west-to-east — matches the v3.1 file.
  const cells = [];
  for (let j = jStart; j <= jEnd; j++) {
    for (let i = iStart; i <= iEnd; i++) {
      const cLon = ORIGIN_LON + (i + 0.5) * CELL_LON;
      const cLat = ORIGIN_LAT + (j + 0.5) * CELL_LAT;
      if (cLon < minLon || cLon > maxLon || cLat < minLat || cLat > maxLat) continue;
      if (!pointInRing(cLon, cLat, ring)) continue;
      const lon0 = +(ORIGIN_LON + i * CELL_LON).toFixed(5);
      const lat0 = +(ORIGIN_LAT + j * CELL_LAT).toFixed(5);
      const lon1 = +(ORIGIN_LON + (i + 1) * CELL_LON).toFixed(5);
      const lat1 = +(ORIGIN_LAT + (j + 1) * CELL_LAT).toFixed(5);
      cells.push({ lon0, lat0, lon1, lat1 });
    }
  }

  cells.forEach((cell, idx) => {
    const chunkIndex = idx + 1;
    const slug = `${raion.properties.slug}-${chunkIndex}`;
    const nameEn = `${raion.properties.name_en} ${chunkIndex}`;

    features.push({
      type: "Feature",
      properties: {
        slug,
        parent_slug: raion.properties.slug,
        parent_name_en: raion.properties.name_en,
        parent_name_ka: raion.properties.name_ka,
        parent_name_ru: raion.properties.name_ru,
        index: chunkIndex,
        color_index: colorIndex,
        name_en: nameEn,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [cell.lon0, cell.lat0],
            [cell.lon1, cell.lat0],
            [cell.lon1, cell.lat1],
            [cell.lon0, cell.lat1],
            [cell.lon0, cell.lat0],
          ],
        ],
      },
    });

    const esc = (s) => s.replace(/'/g, "''");
    sqlRows.push(
      `    ('${esc(slug)}', '${esc(nameEn)}', '${esc(raion.properties.slug)}', ${colorIndex}, ${chunkIndex}, ${REWARD_XP})`,
    );
  });

  console.log(`${raion.properties.slug}: ${cells.length} chunks (color ${colorIndex})`);
}

console.log(`total: ${features.length} chunks`);

writeFileSync(
  OUT_GEOJSON,
  JSON.stringify({ type: "FeatureCollection", features }),
);

const migration = `-- ============================================================================
-- Mission chunks resize: ${features.length} chunks at the configured cell size.
--
-- Wipes mission_dog_credits, mission_completions, and any in-flight
-- active_mission_* state because chunk slugs change.
--
-- Generated by scripts/regen-chunks.mjs. Don't hand-edit — change CELL_LON /
-- CELL_LAT in the script and re-run instead.
-- ============================================================================

ALTER TABLE public.mission_districts
    ADD COLUMN IF NOT EXISTS parent_slug TEXT,
    ADD COLUMN IF NOT EXISTS color_index INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 1;

DELETE FROM public.mission_dog_credits;
DELETE FROM public.mission_completions;
UPDATE public.profiles
   SET active_mission_slug = NULL,
       active_mission_started_at = NULL,
       active_mission_distinct_count = 0,
       active_mission_awards_today = 0,
       active_mission_award_date = NULL;

DELETE FROM public.mission_districts;

INSERT INTO public.mission_districts
    (slug, name_en, parent_slug, color_index, chunk_index, reward_xp)
VALUES
${sqlRows.join(",\n")};
`;

writeFileSync(OUT_MIGRATION, migration);

console.log(`wrote ${OUT_GEOJSON}`);
console.log(`wrote ${OUT_MIGRATION}`);
