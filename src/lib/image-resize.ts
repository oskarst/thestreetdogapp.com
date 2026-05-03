/**
 * Client-side image resize. Modern iPhone photos hit 8–15MB and Vercel's
 * serverless body cap is ~4.5MB, so an unresized upload simply 413s
 * before our route runs. We also strip EXIF here as a side-effect of
 * canvas decode — the server does it again with sharp(), but keeping
 * orientation correct on the upload is what matters for the preview.
 *
 * Returns the original File untouched if it already fits the target
 * dimensions and size — no point re-encoding a 200KB image.
 */
const MAX_DIMENSION = 2048;
const TARGET_QUALITY = 0.85;
const SKIP_RESIZE_IF_UNDER_BYTES = 600 * 1024; // 600KB

export async function resizeImage(file: File): Promise<File> {
  // Cheap escape hatch: a small image already under the threshold is
  // unlikely to need work. Decoding + re-encoding is expensive on phones.
  if (file.size < SKIP_RESIZE_IF_UNDER_BYTES) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // createImageBitmap may not support HEIC on every browser. iOS
    // Safari typically converts HEIC→JPEG on <input type=file> already,
    // but if decode fails we fall back to the original file and let
    // the server reject it.
    return file;
  }

  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION && file.type === "image/jpeg") {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / longest);
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", TARGET_QUALITY)
  );
  if (!blob) return file;

  // Preserve the original filename stem; force .jpg since we re-encoded.
  const stem = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${stem}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
