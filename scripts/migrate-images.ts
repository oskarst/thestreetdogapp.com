/**
 * Image migration script: Downloads images from existing storage and
 * uploads them to Supabase Storage, then updates DB rows with new URLs.
 *
 * Required env vars:
 *   DATABASE_URL                — Flask PostgreSQL connection string
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: npx tsx scripts/migrate-images.ts
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SOURCE_DB_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 10;

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

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    // Handle local file paths
    if (url.startsWith("/") || url.startsWith("./")) {
      if (fs.existsSync(url)) {
        return fs.readFileSync(url);
      }
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      log("DOWNLOAD", `  Failed ${url}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    log("DOWNLOAD", `  Error downloading ${url}: ${err}`);
    return null;
  }
}

function getExtension(url: string): string {
  const parsed = url.split("?")[0];
  const ext = path.extname(parsed).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) return ext;
  return ".jpg";
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return types[ext] ?? "image/jpeg";
}

async function uploadToSupabase(
  bucket: string,
  storagePath: string,
  data: Buffer,
  contentType: string
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, data, { contentType, upsert: true });

  if (error) {
    log("UPLOAD", `  Error uploading to ${bucket}/${storagePath}: ${error.message}`);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return publicUrl;
}

// ---------------------------------------------------------------------------
// Process images in parallel batches
// ---------------------------------------------------------------------------

interface ImageTask {
  type: "dog_image" | "ear_tag_image" | "sighting_image" | "sighting_ear_tag";
  recordId: string;
  oldUrl: string;
  imageIndex?: number; // for dogs.images array
}

async function processTask(task: ImageTask): Promise<{
  task: ImageTask;
  newUrl: string | null;
}> {
  const data = await downloadImage(task.oldUrl);
  if (!data) return { task, newUrl: null };

  const ext = getExtension(task.oldUrl);
  const contentType = getContentType(ext);
  const filename = `migrated/${task.recordId}/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

  let bucket: string;
  if (task.type === "ear_tag_image" || task.type === "sighting_ear_tag") {
    bucket = "ear-tags";
  } else {
    bucket = "dogs";
  }

  const newUrl = await uploadToSupabase(bucket, filename, data, contentType);
  return { task, newUrl };
}

async function processBatch(tasks: ImageTask[]): Promise<void> {
  const results = await Promise.all(tasks.map(processTask));

  for (const { task, newUrl } of results) {
    if (!newUrl) continue;

    if (task.type === "dog_image" && task.imageIndex !== undefined) {
      // Update specific image in the images array
      const { data: dog } = await supabase
        .from("dogs")
        .select("images")
        .eq("id", task.recordId)
        .single();

      if (dog?.images) {
        const images = [...dog.images];
        images[task.imageIndex] = newUrl;
        await supabase
          .from("dogs")
          .update({ images })
          .eq("id", task.recordId);
      }
    } else if (task.type === "ear_tag_image") {
      await supabase
        .from("dogs")
        .update({ ear_tag_image: newUrl })
        .eq("id", task.recordId);
    } else if (task.type === "sighting_image") {
      await supabase
        .from("sightings")
        .update({ image_url: newUrl })
        .eq("id", task.recordId);
    } else if (task.type === "sighting_ear_tag") {
      await supabase
        .from("sightings")
        .update({ ear_tag_image_url: newUrl })
        .eq("id", task.recordId);
    }
  }
}

// ---------------------------------------------------------------------------
// Collect all image tasks
// ---------------------------------------------------------------------------

async function collectTasks(): Promise<ImageTask[]> {
  const tasks: ImageTask[] = [];

  // 1. Dog images (from images JSONB array)
  log("COLLECT", "Reading dog images...");
  const { rows: dogs } = await pool.query(
    `SELECT id, images, ear_tag_image FROM dogs`
  );

  for (const dog of dogs) {
    const images: string[] = dog.images ?? [];
    for (let i = 0; i < images.length; i++) {
      if (images[i]) {
        tasks.push({
          type: "dog_image",
          recordId: String(dog.id),
          oldUrl: images[i],
          imageIndex: i,
        });
      }
    }

    if (dog.ear_tag_image) {
      tasks.push({
        type: "ear_tag_image",
        recordId: String(dog.id),
        oldUrl: dog.ear_tag_image,
      });
    }
  }

  // 2. Sighting images
  log("COLLECT", "Reading sighting images...");
  const { rows: sightings } = await pool.query(
    `SELECT id, image_url, ear_tag_image_url FROM sightings
     WHERE image_url IS NOT NULL OR ear_tag_image_url IS NOT NULL`
  );

  for (const s of sightings) {
    if (s.image_url) {
      tasks.push({
        type: "sighting_image",
        recordId: String(s.id),
        oldUrl: s.image_url,
      });
    }
    if (s.ear_tag_image_url) {
      tasks.push({
        type: "sighting_ear_tag",
        recordId: String(s.id),
        oldUrl: s.ear_tag_image_url,
      });
    }
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("Street Dog App — Image Migration");
  console.log("=".repeat(60));

  try {
    const tasks = await collectTasks();
    log("MAIN", `Total images to migrate: ${tasks.length}`);

    if (tasks.length === 0) {
      log("MAIN", "No images to migrate.");
      return;
    }

    let processed = 0;

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
      processed += batch.length;
      log("MAIN", `Progress: ${processed}/${tasks.length} (${Math.round((processed / tasks.length) * 100)}%)`);
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Image migration complete! Processed ${processed} images.`);
    console.log("=".repeat(60));
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
