/**
 * Backfill sightings for AppSheet-imported dogs.
 *
 * Each row in the original Dogs.csv represents a sighting. The earlier
 * import created the dogs but no sightings rows, leaving the historical
 * timeline empty. This script re-reads the CSV, attributes each row to
 * a system "legacy-import" user, and inserts a sightings record per row
 * (matched against imports/appsheet-mapping.json by AppSheet Dog Id).
 *
 * Idempotent: re-running skips entries already marked sighting_id in the
 * mapping JSON.
 *
 * Usage: run after import-appsheet.ts + import-appsheet-images.ts.
 *   npx tsx scripts/backfill-appsheet-sightings.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// .env autoloader
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

for (const p of [
  path.resolve(process.cwd(), ".env.local"),
  "/Users/pooka/Documents/Workspace/streetdog-app/.env.local",
]) {
  if (loadEnvFile(p)) {
    console.log(`[env] loaded ${p}`);
    break;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DOGS_CSV =
  process.argv[2] ??
  "/Users/pooka/Downloads/The Dog collector - Dogs.csv";
const MAPPING_FILE = path.resolve(
  process.cwd(),
  "imports/appsheet-mapping.json"
);
const DESCRIPTIONS_FILE = path.resolve(
  process.cwd(),
  "imports/appsheet-descriptions.json"
);
const SYSTEM_USER_EMAIL = "legacy-import@street.dog";
const SYSTEM_USER_NICKNAME = "Legacy Import";

// ---------------------------------------------------------------------------
// CSV parser (same as import-appsheet.ts)
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
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c !== "\r") field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
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
// Field mappers (same as import-appsheet.ts)
// ---------------------------------------------------------------------------

function mapCharacter(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v.includes("very") && v.includes("friendly")) return "very_friendly";
  if (v.startsWith("friendly")) return "friendly";
  if (v.startsWith("indifferent")) return "indifferent";
  if (v.startsWith("sleeping")) return "sleeping";
  if (v.startsWith("afraid") || v.startsWith("scared")) return "afraid";
  if (v.startsWith("aggressive")) return "aggressive";
  return "indifferent"; // default for sightings (NOT NULL)
}

function mapGender(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "male") return "male";
  if (v === "female") return "female";
  return "unknown"; // default
}

function mapAge(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "puppy") return "puppy";
  if (v === "young") return "young";
  if (v === "adult") return "adult";
  if (v === "old") return "old";
  return "adult"; // default
}

function parseSize(raw: string): number {
  const n = parseInt(raw.trim(), 10);
  if (!isFinite(n) || n < 1 || n > 10) return 5; // middle default
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
// Find or create the system user
// ---------------------------------------------------------------------------

async function ensureSystemUser(): Promise<string> {
  // Check the profiles table first — it's the canonical source for our app.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", SYSTEM_USER_EMAIL)
    .maybeSingle();
  if (existing) {
    console.log(`[user] reusing existing legacy-import user ${existing.id}`);
    return existing.id;
  }

  // Create the auth user. The handle_new_user trigger should auto-create
  // the matching profiles row with the nickname from user_metadata.
  const { data, error } = await supabase.auth.admin.createUser({
    email: SYSTEM_USER_EMAIL,
    email_confirm: true,
    user_metadata: { nickname: SYSTEM_USER_NICKNAME },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create system user: ${error?.message}`);
  }
  console.log(`[user] created legacy-import user ${data.user.id}`);
  return data.user.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface MappingEntry {
  dog_id: string;
  photo_gallery: string | null;
  ear_tag_id: string | null;
  imported_at: string;
  merged_with_existing?: boolean;
  image_uploaded?: boolean;
  uploaded_gallery_url?: string;
  uploaded_ear_tag_url?: string;
  sighting_id?: string;
}

interface DescEntry {
  health: string | null;
  description: string | null;
  shelter_dog: boolean;
}

async function main() {
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error(`Missing ${MAPPING_FILE} — run import-appsheet.ts first.`);
    process.exit(1);
  }
  const mapping: Record<string, MappingEntry> = JSON.parse(
    fs.readFileSync(MAPPING_FILE, "utf8")
  );
  const descriptions: Record<string, DescEntry> = fs.existsSync(
    DESCRIPTIONS_FILE
  )
    ? JSON.parse(fs.readFileSync(DESCRIPTIONS_FILE, "utf8"))
    : {};

  const userId = await ensureSystemUser();

  // Re-read CSV — sighting fields (lat/lng/timestamp/character/etc.) live there.
  const rows = parseCSV(fs.readFileSync(DOGS_CSV, "utf8"));
  const header = rows[0];
  const cols = {
    id: header.indexOf("Dog Id"),
    date: header.indexOf("Date and time"),
    location: header.indexOf("Location"),
    character: header.indexOf("Character"),
    size: header.indexOf("Size"),
    gender: header.indexOf("Gender"),
    age: header.indexOf("Age"),
  };

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const appsheetId = r[cols.id];
    if (!appsheetId) continue;
    const m = mapping[appsheetId];
    if (!m) {
      console.warn(`[skip] ${appsheetId}: not in mapping (deleted dog?)`);
      skipped++;
      continue;
    }
    if (m.sighting_id) {
      skipped++;
      continue; // already backfilled
    }

    const location = parseLocation(r[cols.location] ?? "");
    if (!location) {
      console.warn(`[skip] ${appsheetId}: unparseable location`);
      skipped++;
      continue;
    }

    const desc = descriptions[appsheetId];
    const notesParts: string[] = [];
    if (desc?.description) notesParts.push(desc.description);
    if (desc?.health && desc.health.toLowerCase() !== "healthy") {
      notesParts.push(`Health: ${desc.health}`);
    }
    if (desc?.shelter_dog) notesParts.push("Shelter dog");
    const notes = notesParts.join(" · ") || null;

    const insert = {
      user_id: userId,
      dog_id: m.dog_id,
      latitude: location.lat,
      longitude: location.lng,
      character: mapCharacter(r[cols.character] ?? ""),
      size: parseSize(r[cols.size] ?? ""),
      gender: mapGender(r[cols.gender] ?? ""),
      age: mapAge(r[cols.age] ?? ""),
      notes,
      image_url: m.uploaded_gallery_url ?? null,
      ear_tag_image_url: m.uploaded_ear_tag_url ?? null,
      timestamp: parseDate(r[cols.date] ?? "") ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("sightings")
      .insert(insert)
      .select("id")
      .single();
    if (error || !data) {
      console.error(`[fail] ${appsheetId}: ${error?.message}`);
      failed++;
      continue;
    }
    mapping[appsheetId].sighting_id = data.id;
    inserted++;
  }

  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

  console.log("\n=== Summary ===");
  console.log(`Sightings inserted: ${inserted}`);
  console.log(`Skipped:            ${skipped}`);
  console.log(`Failed:             ${failed}`);
  console.log(`System user id:     ${userId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
