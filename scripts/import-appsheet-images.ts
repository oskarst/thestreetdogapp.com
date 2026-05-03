/**
 * AppSheet image attacher.
 *
 * Reads imports/appsheet-mapping.json, finds the corresponding image files
 * in the AppSheet export folders, uploads them to Supabase Storage, and
 * appends the public URLs onto each dog's images[] / ear_tag_image.
 *
 * Idempotent: re-running skips mapping entries marked image_uploaded.
 *
 * Usage: run after import-appsheet.ts.
 *   npx tsx scripts/import-appsheet-images.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// .env.local autoloader (matches import-appsheet.ts)
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
// Config
// ---------------------------------------------------------------------------

const MAPPING_FILE = path.resolve(
  process.cwd(),
  "imports/appsheet-mapping.json"
);

const PHOTO_FOLDERS = [
  "/Users/pooka/Downloads/TheStreetDogApp2-5724539/Dogs_Images",
  "/Users/pooka/Downloads/TheStreetDogApp2-5724539/Street Dogs Table_Images",
  "/Users/pooka/Downloads/TheStreetDogApp2-5724539/Photos_Images",
  "/Users/pooka/Downloads/Street Dogs Table_Images",
  "/Users/pooka/Downloads/Street Dogs Table_Images-2",
];

const DOGS_BUCKET = "dogs";
const EAR_TAGS_BUCKET = "ear-tags";

// ---------------------------------------------------------------------------
// File index — one pass over all photo folders, key by AppSheet Dog Id
// ---------------------------------------------------------------------------

interface IndexEntry {
  gallery: string[];
  earTag: string[];
}

function buildIndex(): Record<string, IndexEntry> {
  const idx: Record<string, IndexEntry> = {};
  for (const folder of PHOTO_FOLDERS) {
    if (!fs.existsSync(folder)) {
      console.warn(`[index] folder missing: ${folder}`);
      continue;
    }
    for (const f of fs.readdirSync(folder)) {
      const m = f.match(
        /^([0-9a-f]+)\.(Photo Gallery|Photo|Ear Tag Picture)\.\d+\.(jpg|jpeg|png|webp)$/i
      );
      if (!m) continue;
      const [, id, kind] = m;
      if (!idx[id]) idx[id] = { gallery: [], earTag: [] };
      const fullPath = path.join(folder, f);
      if (kind.toLowerCase().includes("ear tag")) {
        if (!idx[id].earTag.includes(fullPath)) idx[id].earTag.push(fullPath);
      } else {
        if (!idx[id].gallery.includes(fullPath)) idx[id].gallery.push(fullPath);
      }
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Upload helpers
// ---------------------------------------------------------------------------

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

async function uploadOne(
  bucket: string,
  storagePath: string,
  localPath: string
): Promise<string> {
  const buf = fs.readFileSync(localPath);
  const ext = path.extname(localPath).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "image/jpeg";
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buf, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

interface MappingEntry {
  dog_id: string;
  photo_gallery: string | null;
  ear_tag_id: string | null;
  imported_at: string;
  merged_with_existing?: boolean;
  image_uploaded?: boolean;
  uploaded_gallery_url?: string;
  uploaded_ear_tag_url?: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error(`Missing ${MAPPING_FILE} — run import-appsheet.ts first.`);
    process.exit(1);
  }
  const mapping: Record<string, MappingEntry> = JSON.parse(
    fs.readFileSync(MAPPING_FILE, "utf8")
  );
  const idx = buildIndex();
  console.log(
    `[index] scanned ${
      PHOTO_FOLDERS.length
    } folders, found ${Object.keys(idx).length} unique ids, ${
      Object.values(idx).reduce((a, e) => a + e.gallery.length + e.earTag.length, 0)
    } files`
  );

  // Group AppSheet ids by destination dog UUID — multiple AppSheet ids can
  // point to the same dog (repeat sightings); we want all their photos.
  const byDog: Record<string, string[]> = {};
  for (const [appId, m] of Object.entries(mapping)) {
    if (m.image_uploaded) continue;
    if (!byDog[m.dog_id]) byDog[m.dog_id] = [];
    byDog[m.dog_id].push(appId);
  }

  console.log(
    `[plan] ${Object.keys(byDog).length} dogs to attach photos to (${
      Object.values(byDog).flat().length
    } AppSheet rows)`
  );

  let uploadedGallery = 0;
  let uploadedEarTag = 0;
  let dogsUpdated = 0;
  let missing: string[] = [];
  let failed = 0;

  for (const [dogId, appIds] of Object.entries(byDog)) {
    // Fetch existing dog row so we can merge image arrays without overwriting.
    const { data: dog, error: fetchErr } = await supabase
      .from("dogs")
      .select("id, images, ear_tag_image")
      .eq("id", dogId)
      .single();
    if (fetchErr || !dog) {
      console.error(
        `[fail] dog ${dogId}: not found — was it deleted? ${fetchErr?.message ?? ""}`
      );
      failed++;
      continue;
    }
    const existingImages: string[] = (dog.images as string[] | null) ?? [];
    let existingEarTag: string | null =
      (dog.ear_tag_image as string | null) ?? null;
    const newImages: string[] = [...existingImages];

    for (const appId of appIds) {
      const files = idx[appId];
      if (!files || files.gallery.length === 0) {
        missing.push(appId);
        continue;
      }

      // Gallery photo (use the first match)
      const galleryFile = files.gallery[0];
      const galleryExt = path.extname(galleryFile).slice(1).toLowerCase();
      try {
        const url = await uploadOne(
          DOGS_BUCKET,
          `legacy/${appId}.${galleryExt}`,
          galleryFile
        );
        if (!newImages.includes(url)) newImages.push(url);
        mapping[appId].uploaded_gallery_url = url;
        uploadedGallery++;
      } catch (err) {
        console.error(
          `[fail] gallery ${appId}: ${
            err instanceof Error ? err.message : err
          }`
        );
        failed++;
      }

      // Ear tag photo (only one — first match if multiple)
      if (files.earTag.length > 0 && !existingEarTag) {
        const tagFile = files.earTag[0];
        const tagExt = path.extname(tagFile).slice(1).toLowerCase();
        try {
          const url = await uploadOne(
            EAR_TAGS_BUCKET,
            `legacy/${appId}.${tagExt}`,
            tagFile
          );
          existingEarTag = url;
          mapping[appId].uploaded_ear_tag_url = url;
          uploadedEarTag++;
        } catch (err) {
          console.error(
            `[fail] ear-tag ${appId}: ${
              err instanceof Error ? err.message : err
            }`
          );
          failed++;
        }
      }

      mapping[appId].image_uploaded = true;
    }

    // Persist the dog's new images + ear_tag_image
    const update: Record<string, unknown> = {};
    if (newImages.length !== existingImages.length) update.images = newImages;
    if (existingEarTag !== (dog.ear_tag_image as string | null)) {
      update.ear_tag_image = existingEarTag;
    }
    if (Object.keys(update).length > 0) {
      const { error: updateErr } = await supabase
        .from("dogs")
        .update(update)
        .eq("id", dogId);
      if (updateErr) {
        console.error(`[fail] update dog ${dogId}: ${updateErr.message}`);
        failed++;
        continue;
      }
      dogsUpdated++;
    }
  }

  // Persist mapping with image_uploaded flags
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

  console.log("\n=== Summary ===");
  console.log(`Dogs updated:           ${dogsUpdated}`);
  console.log(`Gallery photos uploaded: ${uploadedGallery}`);
  console.log(`Ear-tag photos uploaded: ${uploadedEarTag}`);
  console.log(`Missing photo files:    ${missing.length}`);
  console.log(`Failed:                 ${failed}`);
  if (missing.length > 0) {
    console.log(`Missing AppSheet ids: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "…" : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
