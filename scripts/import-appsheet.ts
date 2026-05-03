/**
 * AppSheet → Supabase one-shot importer for "The Dog Collector" data.
 *
 * Reads:
 *   - Dogs.csv: full dog records (master)
 *   - Photos.csv: optional supplement, used only for photo-gallery paths
 *
 * Writes:
 *   - public.dogs rows (no images, no first_registered_by — added later)
 *   - imports/appsheet-mapping.json:    AppSheet Dog Id → { dog_id, photo_gallery }
 *   - imports/appsheet-descriptions.json: AppSheet Dog Id → { health, description }
 *
 * Idempotent: re-running skips Dog Ids already in mapping.json.
 * Dedupe: within CSV by Dog Id; against DB by UNIQUE ear_tag_id.
 *
 * Usage:
 *   npx tsx scripts/import-appsheet.ts \
 *     "/path/to/Dogs.csv" \
 *     "/path/to/Photos - Dogs.csv"
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *      (auto-loaded from .env.local if found in cwd or the canonical
 *      streetdog-app workspace).
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// .env.local autoloader (no dotenv dep)
// ---------------------------------------------------------------------------

function loadEnvFile(p: string): boolean {
  if (!fs.existsSync(p)) return false;
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^['"]|['"]$/g, "");
  }
  return true;
}

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "../streetdog-app/.env.local"),
  "/Users/pooka/Documents/Workspace/streetdog-app/.env.local",
];
for (const p of ENV_CANDIDATES) {
  if (loadEnvFile(p)) {
    console.log(`[env] loaded ${p}`);
    break;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env or .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const DOGS_CSV =
  process.argv[2] ??
  "/Users/pooka/Downloads/The Dog collector - Dogs.csv";
const PHOTOS_CSV =
  process.argv[3] ?? "/Users/pooka/Downloads/Photos - Dogs.csv";
const OUT_DIR = path.resolve(process.cwd(), "imports");
const MAPPING_FILE = path.join(OUT_DIR, "appsheet-mapping.json");
const DESCRIPTIONS_FILE = path.join(OUT_DIR, "appsheet-descriptions.json");

// ---------------------------------------------------------------------------
// CSV parser (handles quoted commas + escaped quotes)
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // drop trailing empty row
  while (
    rows.length > 0 &&
    rows[rows.length - 1].length === 1 &&
    rows[rows.length - 1][0] === ""
  ) {
    rows.pop();
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

const CHARACTER_VALUES = [
  "friendly",
  "very_friendly",
  "indifferent",
  "sleeping",
  "afraid",
  "aggressive",
] as const;
type Character = (typeof CHARACTER_VALUES)[number];

function mapCharacter(raw: string): Character | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.includes("very") && v.includes("friendly")) return "very_friendly";
  if (v.startsWith("friendly")) return "friendly";
  if (v.startsWith("indifferent")) return "indifferent";
  if (v.startsWith("sleeping")) return "sleeping";
  if (v.startsWith("afraid") || v.startsWith("scared")) return "afraid";
  if (v.startsWith("aggressive")) return "aggressive";
  return null;
}

const GENDER_VALUES = ["male", "female", "unknown"] as const;
type Gender = (typeof GENDER_VALUES)[number];

function mapGender(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (v === "male") return "male";
  if (v === "female") return "female";
  if (
    v === "" ||
    v.includes("can't") ||
    v.includes("cant") ||
    v.includes("not sure") ||
    v === "unknown"
  ) {
    return "unknown";
  }
  return null;
}

const AGE_VALUES = ["puppy", "young", "adult", "old"] as const;
type Age = (typeof AGE_VALUES)[number];

function mapAge(raw: string): Age | null {
  const v = raw.trim().toLowerCase();
  if (v === "puppy") return "puppy";
  if (v === "young") return "young";
  if (v === "adult") return "adult";
  if (v === "old") return "old";
  return null;
}

/**
 * Some operators wrote nonsense in the ear-tag column ("cant tell", "?", etc.).
 * Treat those as untagged so they don't become bogus UNIQUE constraints.
 */
const BAD_TAG_VALUES = new Set([
  "cant tell",
  "can't tell",
  "cannot tell",
  "not sure",
  "unknown",
  "n/a",
  "na",
  "?",
  "-",
]);

function normalizeTagId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (BAD_TAG_VALUES.has(t.toLowerCase())) return null;
  return t;
}

function parseSize(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  if (!isFinite(n) || n < 1 || n > 10) return null;
  return n;
}

function parseLocation(raw: string): { lat: number; lng: number } | null {
  const m = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function parseDate(raw: string): string | null {
  if (!raw.trim()) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface MappingEntry {
  dog_id: string;
  photo_gallery: string | null;
  ear_tag_id: string | null;
  imported_at: string;
  /** True when this AppSheet row was a repeat sighting of an already-imported dog. */
  merged_with_existing?: boolean;
}

interface DescEntry {
  health: string | null;
  description: string | null;
  shelter_dog: boolean;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const existingMapping: Record<string, MappingEntry> = fs.existsSync(
    MAPPING_FILE
  )
    ? JSON.parse(fs.readFileSync(MAPPING_FILE, "utf8"))
    : {};
  const existingDescriptions: Record<string, DescEntry> = fs.existsSync(
    DESCRIPTIONS_FILE
  )
    ? JSON.parse(fs.readFileSync(DESCRIPTIONS_FILE, "utf8"))
    : {};

  // Cleanup pass: zero out any bad tag values on dogs we previously imported.
  // (E.g. a "cant tell" tag that got through before we added the normalizer.)
  const ourDogIds = Object.values(existingMapping).map((m) => m.dog_id);
  if (ourDogIds.length > 0) {
    const { data: maybeBad } = await supabase
      .from("dogs")
      .select("id, ear_tag_id")
      .in("id", ourDogIds)
      .not("ear_tag_id", "is", null);
    for (const d of maybeBad ?? []) {
      const tag = (d.ear_tag_id as string | null) ?? "";
      if (BAD_TAG_VALUES.has(tag.toLowerCase())) {
        await supabase
          .from("dogs")
          .update({ ear_tag_id: null })
          .eq("id", d.id);
        console.log(`[clean] cleared bad tag "${tag}" from ${d.id}`);
      }
    }
  }

  const dogsRows = parseCSV(fs.readFileSync(DOGS_CSV, "utf8"));
  const dogsHeader = dogsRows[0];
  const dogsBody = dogsRows.slice(1);

  const photosRows = parseCSV(fs.readFileSync(PHOTOS_CSV, "utf8"));
  const photosHeader = photosRows[0];
  const photosBody = photosRows.slice(1);
  const photoMap = new Map<string, string>();
  const photoIdIdx = photosHeader.indexOf("Dog Id");
  const photoPhotoIdx = photosHeader.indexOf("Photo Gallery");
  for (const r of photosBody) {
    const id = r[photoIdIdx];
    const photo = r[photoPhotoIdx];
    if (id && photo) photoMap.set(id, photo);
  }

  // Required headers — fail fast if missing
  const cols = {
    id: dogsHeader.indexOf("Dog Id"),
    date: dogsHeader.indexOf("Date and time"),
    photo: dogsHeader.indexOf("Photo Gallery"),
    name: dogsHeader.indexOf("Dog Name"),
    hasTag: dogsHeader.indexOf("Has Ear Tag"),
    tagId: dogsHeader.indexOf("Ear Tag ID"),
    location: dogsHeader.indexOf("Location"),
    character: dogsHeader.indexOf("Character"),
    size: dogsHeader.indexOf("Size"),
    health: dogsHeader.indexOf("Health"),
    gender: dogsHeader.indexOf("Gender"),
    age: dogsHeader.indexOf("Age"),
    description: dogsHeader.indexOf("Description"),
    shelter: dogsHeader.indexOf("Shelter dog"),
  };
  for (const [k, v] of Object.entries(cols)) {
    if (v === -1) {
      console.error(`Missing required column: ${k}`);
      process.exit(1);
    }
  }

  // Dedupe within Dogs.csv by Dog Id
  const seen = new Set<string>();
  const records: string[][] = [];
  for (const r of dogsBody) {
    const id = r[cols.id];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    records.push(r);
  }

  console.log(
    `[parse] Dogs.csv: ${dogsBody.length} rows, ${records.length} unique`
  );
  console.log(`[parse] Photos.csv: ${photosBody.length} rows`);
  const toImport = records.filter((r) => !existingMapping[r[cols.id]]);
  console.log(
    `[parse] skipping ${
      records.length - toImport.length
    } already-imported, ${toImport.length} to import`
  );

  const newMapping = { ...existingMapping };
  const newDescriptions = { ...existingDescriptions };

  let inserted = 0;
  let merged = 0;
  let skippedNoLocation = 0;
  let failed = 0;
  const unmappedCharacter = new Set<string>();
  const unmappedGender = new Set<string>();
  const unmappedAge = new Set<string>();

  for (const r of toImport) {
    const appsheetId = r[cols.id];
    const dateStr = r[cols.date];
    const photo = r[cols.photo];
    const dogName = (r[cols.name] ?? "").trim();
    const hasTag = r[cols.hasTag] === "Yes";
    const tagId = hasTag ? normalizeTagId(r[cols.tagId]) : null;
    const location = parseLocation(r[cols.location] ?? "");
    const charRaw = r[cols.character] ?? "";
    const character = mapCharacter(charRaw);
    if (!character && charRaw.trim()) unmappedCharacter.add(charRaw);
    const size = parseSize(r[cols.size] ?? "");
    const genderRaw = r[cols.gender] ?? "";
    const gender = mapGender(genderRaw);
    if (!gender && genderRaw.trim()) unmappedGender.add(genderRaw);
    const ageRaw = r[cols.age] ?? "";
    const age = mapAge(ageRaw);
    if (!age && ageRaw.trim()) unmappedAge.add(ageRaw);
    const description = (r[cols.description] ?? "").trim() || null;
    const health = (r[cols.health] ?? "").trim() || null;
    const shelter = (r[cols.shelter] ?? "").trim() === "Yes";
    const date = parseDate(dateStr);

    if (!location) {
      console.warn(`[skip] ${appsheetId}: no parseable location`);
      skippedNoLocation++;
      continue;
    }

    const insert = {
      ear_tag_id: tagId,
      names: dogName ? [dogName] : [],
      images: [],
      ear_tag_image: null,
      last_latitude: location.lat,
      last_longitude: location.lng,
      last_sighting_date: date,
      character,
      size,
      gender,
      age,
      first_registered_by_id: null,
    };

    const { data, error } = await supabase
      .from("dogs")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      // Tag conflict — same physical dog, repeat sighting. Merge instead of skip.
      if (error.code === "23505" && tagId) {
        const { data: existing, error: lookupErr } = await supabase
          .from("dogs")
          .select("id, last_sighting_date, names")
          .eq("ear_tag_id", tagId)
          .single();
        if (lookupErr || !existing) {
          console.error(
            `[fail] ${appsheetId}: dup tag "${tagId}" but lookup failed: ${lookupErr?.message}`
          );
          failed++;
          continue;
        }

        const update: Record<string, unknown> = {};
        const isNewer =
          date != null &&
          (existing.last_sighting_date == null ||
            date > existing.last_sighting_date);
        if (isNewer) {
          update.last_latitude = location.lat;
          update.last_longitude = location.lng;
          update.last_sighting_date = date;
          if (character) update.character = character;
          if (size != null) update.size = size;
          if (gender) update.gender = gender;
          if (age) update.age = age;
        }
        if (dogName) {
          const existingNames =
            (existing.names as string[] | null | undefined) ?? [];
          if (!existingNames.includes(dogName)) {
            update.names = [...existingNames, dogName];
          }
        }
        if (Object.keys(update).length > 0) {
          await supabase
            .from("dogs")
            .update(update)
            .eq("id", existing.id);
        }

        newMapping[appsheetId] = {
          dog_id: existing.id,
          photo_gallery: photo || photoMap.get(appsheetId) || null,
          ear_tag_id: tagId,
          imported_at: new Date().toISOString(),
          merged_with_existing: true,
        };
        if (description || health) {
          newDescriptions[appsheetId] = {
            health,
            description,
            shelter_dog: shelter,
          };
        }
        merged++;
        console.log(
          `[merge] ${appsheetId} → ${existing.id} (tag ${tagId}${
            isNewer ? ", updated last_*" : ""
          })`
        );
        continue;
      }
      console.error(`[fail] ${appsheetId}: ${error.message}`);
      failed++;
      continue;
    }

    newMapping[appsheetId] = {
      dog_id: data.id,
      photo_gallery: photo || photoMap.get(appsheetId) || null,
      ear_tag_id: tagId,
      imported_at: new Date().toISOString(),
    };
    if (description || health) {
      newDescriptions[appsheetId] = {
        health,
        description,
        shelter_dog: shelter,
      };
    }
    inserted++;
  }

  fs.writeFileSync(MAPPING_FILE, JSON.stringify(newMapping, null, 2));
  fs.writeFileSync(
    DESCRIPTIONS_FILE,
    JSON.stringify(newDescriptions, null, 2)
  );

  console.log("\n=== Summary ===");
  console.log(`Inserted (new dogs):    ${inserted}`);
  console.log(`Merged (repeat sights): ${merged}`);
  console.log(`Skipped no-location:    ${skippedNoLocation}`);
  console.log(`Failed:                 ${failed}`);
  if (unmappedCharacter.size > 0) {
    console.log(
      `\nUnmapped Character values: ${[...unmappedCharacter].join(" · ")}`
    );
  }
  if (unmappedGender.size > 0) {
    console.log(
      `Unmapped Gender values:    ${[...unmappedGender].join(" · ")}`
    );
  }
  if (unmappedAge.size > 0) {
    console.log(`Unmapped Age values:       ${[...unmappedAge].join(" · ")}`);
  }
  console.log(`\nMapping:      ${MAPPING_FILE}`);
  console.log(`Descriptions: ${DESCRIPTIONS_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
