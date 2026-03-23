/**
 * Data migration script: Flask PostgreSQL -> Supabase
 *
 * Reads users, dogs, sightings, favorites, and reports from the existing
 * Flask PostgreSQL database and inserts them into Supabase, preserving UUIDs.
 *
 * Required env vars:
 *   DATABASE_URL          — Flask PostgreSQL connection string
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: npx tsx scripts/migrate-data.ts
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SOURCE_DB_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SOURCE_DB_URL || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing required env vars: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: SOURCE_DB_URL });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(section: string, msg: string) {
  console.log(`[${section}] ${msg}`);
}

function toISOStringOrNull(val: Date | string | null): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

// ---------------------------------------------------------------------------
// 1. Migrate users -> auth.users + profiles
// ---------------------------------------------------------------------------

async function migrateUsers() {
  log("USERS", "Reading source users...");
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, nickname, role, is_banned,
            ocr_usage_count, last_activity, created_at, updated_at
     FROM users ORDER BY created_at`
  );
  log("USERS", `Found ${rows.length} users`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of rows) {
    const userId = String(user.id);

    // Create auth user preserving UUID
    const { error: authError } = await supabase.auth.admin.createUser({
      id: userId,
      email: user.email,
      email_confirm: true,
      // Set a random password; users will use OAuth or password reset
      password: `migrate_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        skipped++;
      } else {
        log("USERS", `  ERROR creating auth user ${user.email}: ${authError.message}`);
        errors++;
        continue;
      }
    } else {
      created++;
    }

    // Upsert profile row
    const roleMap: Record<string, string> = {
      USER: "user",
      RESCUER: "rescuer",
      ADMIN: "admin",
      user: "user",
      rescuer: "rescuer",
      admin: "admin",
    };
    const role = roleMap[user.role] ?? "user";

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: user.email,
        nickname: user.nickname,
        role,
        is_banned: user.is_banned ?? false,
        ocr_usage_count: user.ocr_usage_count ?? 0,
        last_activity: toISOStringOrNull(user.last_activity) ?? new Date().toISOString(),
        created_at: toISOStringOrNull(user.created_at) ?? new Date().toISOString(),
        updated_at: toISOStringOrNull(user.updated_at) ?? new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      log("USERS", `  ERROR upserting profile ${user.email}: ${profileError.message}`);
      errors++;
    }
  }

  log("USERS", `Done. Created: ${created}, Skipped (existing): ${skipped}, Errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// 2. Migrate dogs
// ---------------------------------------------------------------------------

async function migrateDogs() {
  log("DOGS", "Reading source dogs...");
  const { rows } = await pool.query(
    `SELECT id, ear_tag_id, names, images, ear_tag_image,
            last_latitude, last_longitude, last_sighting_date,
            character, size, gender, age, first_registered_by_id,
            created_at, updated_at
     FROM dogs ORDER BY created_at`
  );
  log("DOGS", `Found ${rows.length} dogs`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const dog of rows) {
    const { error } = await supabase.from("dogs").upsert(
      {
        id: String(dog.id),
        ear_tag_id: dog.ear_tag_id || null,
        names: dog.names ?? [],
        images: dog.images ?? [],
        ear_tag_image: dog.ear_tag_image || null,
        last_latitude: dog.last_latitude,
        last_longitude: dog.last_longitude,
        last_sighting_date: toISOStringOrNull(dog.last_sighting_date),
        character: dog.character || null,
        size: dog.size,
        gender: dog.gender || null,
        age: dog.age || null,
        first_registered_by_id: dog.first_registered_by_id
          ? String(dog.first_registered_by_id)
          : null,
        created_at: toISOStringOrNull(dog.created_at) ?? new Date().toISOString(),
        updated_at: toISOStringOrNull(dog.updated_at) ?? new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      if (error.message?.includes("duplicate")) {
        skipped++;
      } else {
        log("DOGS", `  ERROR dog ${dog.id}: ${error.message}`);
        errors++;
      }
    } else {
      inserted++;
    }
  }

  log("DOGS", `Done. Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// 3. Migrate sightings
// ---------------------------------------------------------------------------

async function migrateSightings() {
  log("SIGHTINGS", "Reading source sightings...");
  const { rows } = await pool.query(
    `SELECT id, user_id, dog_id, latitude, longitude,
            character, size, gender, age, notes,
            image_url, ear_tag_image_url, timestamp
     FROM sightings ORDER BY timestamp`
  );
  log("SIGHTINGS", `Found ${rows.length} sightings`);

  let inserted = 0;
  let errors = 0;

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((s) => ({
      id: String(s.id),
      user_id: String(s.user_id),
      dog_id: String(s.dog_id),
      latitude: s.latitude,
      longitude: s.longitude,
      character: s.character,
      size: s.size,
      gender: s.gender,
      age: s.age,
      notes: s.notes || null,
      image_url: s.image_url || null,
      ear_tag_image_url: s.ear_tag_image_url || null,
      timestamp: toISOStringOrNull(s.timestamp) ?? new Date().toISOString(),
    }));

    const { error } = await supabase.from("sightings").upsert(batch, {
      onConflict: "id",
    });

    if (error) {
      log("SIGHTINGS", `  ERROR batch ${i}-${i + batch.length}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    if ((i + batchSize) % 500 === 0 || i + batchSize >= rows.length) {
      log("SIGHTINGS", `  Progress: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }
  }

  log("SIGHTINGS", `Done. Inserted: ${inserted}, Errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// 4. Migrate favorites
// ---------------------------------------------------------------------------

async function migrateFavorites() {
  log("FAVORITES", "Reading source favorites...");
  const { rows } = await pool.query(
    `SELECT id, user_id, dog_id, created_at FROM favorites ORDER BY created_at`
  );
  log("FAVORITES", `Found ${rows.length} favorites`);

  let inserted = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((f) => ({
      id: String(f.id),
      user_id: String(f.user_id),
      dog_id: String(f.dog_id),
      created_at: toISOStringOrNull(f.created_at) ?? new Date().toISOString(),
    }));

    const { error } = await supabase.from("favorites").upsert(batch, {
      onConflict: "id",
    });

    if (error) {
      log("FAVORITES", `  ERROR batch ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  log("FAVORITES", `Done. Inserted: ${inserted}, Errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// 5. Migrate reports
// ---------------------------------------------------------------------------

async function migrateReports() {
  log("REPORTS", "Reading source reports...");
  const { rows } = await pool.query(
    `SELECT id, user_id, dog_id, report_type, message, status, created_at
     FROM reports ORDER BY created_at`
  );
  log("REPORTS", `Found ${rows.length} reports`);

  let inserted = 0;
  let errors = 0;

  // Map Flask report_type values to new enum values
  const reportTypeMap: Record<string, string> = {
    health: "health",
    feedback: "feedback",
    general: "other",
    issue: "issue",
    other: "other",
  };

  const statusMap: Record<string, string> = {
    open: "open",
    in_progress: "in_progress",
    resolved: "resolved",
  };

  for (const r of rows) {
    const { error } = await supabase.from("reports").upsert(
      {
        id: String(r.id),
        user_id: String(r.user_id),
        dog_id: r.dog_id ? String(r.dog_id) : null,
        report_type: reportTypeMap[r.report_type] ?? "other",
        message: r.message,
        status: statusMap[r.status] ?? "open",
        created_at: toISOStringOrNull(r.created_at) ?? new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      log("REPORTS", `  ERROR report ${r.id}: ${error.message}`);
      errors++;
    } else {
      inserted++;
    }
  }

  log("REPORTS", `Done. Inserted: ${inserted}, Errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("Street Dog App — Data Migration");
  console.log("=".repeat(60));

  try {
    await migrateUsers();
    await migrateDogs();
    await migrateSightings();
    await migrateFavorites();
    await migrateReports();

    console.log("\n" + "=".repeat(60));
    console.log("Migration complete!");
    console.log("=".repeat(60));
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
