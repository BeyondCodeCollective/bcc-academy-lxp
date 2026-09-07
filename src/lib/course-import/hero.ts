// Auto-art for a freshly created course: a hero PHOTO for the landing page
// (library first, Pexels fallback) and a branded flat-illustration GRAPHIC for
// the course banner + OG card. Runs inside the create flow so pages never
// launch bare — but strictly best-effort: any failure here returns null and
// the course ships without art, exactly as it did before.

import { experimental_generateImage as generateImage, gateway } from "ai";
import type { createServiceClient } from "@/lib/supabase/server";
import { getProgramBySlug } from "@/lib/programs";
import { pickLibraryPhoto, searchPexelsPhoto } from "@/lib/media-library";
import type { CourseDraft } from "./parse";

// Flat illustration is Recraft's home turf; photorealistic models drift toward
// the AI-photo look the brand avoids.
const IMAGE_MODEL = "recraft/recraft-v3";

/** 16:9 at Recraft's supported dimensions — the course banner renders
 *  full-width and uncropped, so a square would letterbox badly. */
const COVER_SIZE = "1820x1024" as const;

type Svc = ReturnType<typeof createServiceClient>;

// Art is best-effort inside a user-facing create action: a stalled provider
// must never eat the function's whole time budget and strand a half-created
// course behind a timeout. Late finishers resolve into the void.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[hero] ${label} timed out after ${ms}ms — course ships without it`);
        resolve(null);
      }, ms),
    ),
  ]);
}

function courseSummary(draft: CourseDraft): string {
  return [
    draft.name,
    draft.description,
    (draft.objectives ?? []).join("; "),
    draft.sessions?.map((s) => s.topic).join(", "),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);
}

export type HeroPhotoResult = { url: string; source: "library" | "pexels" };

/** Best photo for the landing hero: curated library first, Pexels fallback. */
export async function resolveHeroPhoto(
  svc: Svc,
  draft: CourseDraft,
): Promise<HeroPhotoResult | null> {
  try {
    return await withTimeout(
      (async (): Promise<HeroPhotoResult | null> => {
        const { photo, searchQuery } = await pickLibraryPhoto(svc, courseSummary(draft));
        if (photo) return { url: photo.url, source: "library" };

        const pexels = await searchPexelsPhoto(searchQuery);
        if (pexels) return { url: pexels.url, source: "pexels" };
        return null;
      })(),
      25_000,
      "hero photo pick",
    );
  } catch (err) {
    console.error("[resolveHeroPhoto] failed:", err);
  }
  return null;
}

/** Branded 16:9 cover illustration (Cyberdeck style: dark tinted ground,
 *  program-hue accents, flat CSS-shape look, no text). Uploaded to the public
 *  landing bucket; returns its URL. */
export async function generateCoverGraphic(
  svc: Svc,
  draft: CourseDraft,
  programSlug: string,
): Promise<string | null> {
  try {
    return await withTimeout(generateCoverGraphicInner(svc, draft, programSlug), 60_000, "cover graphic");
  } catch (err) {
    console.error("[generateCoverGraphic] failed:", err);
    return null;
  }
}

async function generateCoverGraphicInner(
  svc: Svc,
  draft: CourseDraft,
  programSlug: string,
): Promise<string | null> {
  try {
    const colors = getProgramBySlug(programSlug).colors;
    const prompt = `Flat vector-style editorial illustration for a tech-education course cover, 16:9.
Subject: ${draft.name}. ${draft.description?.slice(0, 300) ?? ""}
Style: near-black matte ground subtly tinted toward ${colors.primary}, one or two large soft radial glows in ${colors.accent} behind the subject, a faint dot grid on one side. Centered bespoke flat illustration of the course subject built from simple geometric shapes, tilted about 3 degrees, with small in-world details and highlights in ${colors.accent} plus a muted green secondary. Modern, matte, confident. Absolutely no text, no letters, no words, no logos, no watermarks, no photorealism, no rainbow gradients.`;

    const { image } = await generateImage({
      model: gateway.imageModel(IMAGE_MODEL),
      prompt,
      // Recraft rejects aspectRatio ("this model does not support aspect
      // ratio") and silently falls back to its own default — pass the 16:9
      // size explicitly so the course banner is never a square.
      size: COVER_SIZE,
    });

    // Recraft returns WebP, not PNG. Labeling it .png/image/png still renders
    // (browsers sniff), but it lies to any consumer that trusts the type, so
    // take the media type the model actually reports.
    const mediaType = image.mediaType ?? "image/png";
    const ext = mediaType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const path = `covers/${crypto.randomUUID()}.${ext}`;
    const { error } = await svc.storage
      .from("landing")
      .upload(path, Buffer.from(image.uint8Array), { contentType: mediaType });
    if (error) {
      console.error("[generateCoverGraphic] upload failed:", error);
      return null;
    }
    return svc.storage.from("landing").getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error("[generateCoverGraphic] failed:", err);
    return null;
  }
}
