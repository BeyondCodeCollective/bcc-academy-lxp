// Client-side image compression for admin uploads. Phone photos and design
// exports routinely run 3-12 MB; downscaling in the browser before upload
// keeps them under the server-action body limit and makes uploads fast on
// hotel wifi. WebP output keeps transparency (logos) and beats JPEG at the
// same quality.
//
// 2400px max dimension: hero panels and course covers render at most ~1200 CSS
// px wide, so 2400 keeps them crisp on retina without shipping print-size
// files. (Embedded deck images have burned us below ~2200px before.)

const MAX_DIMENSION = 2400;
const QUALITY = 0.85;
const SKIP_UNDER_BYTES = 1024 * 1024; // already small — don't touch it

export async function compressImage(file: File): Promise<File> {
  // Only raster types the upload actions accept; anything else passes through
  // untouched and fails (or succeeds) exactly as it does today.
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  if (file.size <= SKIP_UNDER_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // compression didn't help

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
    });
  } catch {
    // Decode failures (corrupt file, exotic encoding) fall back to the
    // original — the server-side checks remain the source of truth.
    return file;
  }
}
