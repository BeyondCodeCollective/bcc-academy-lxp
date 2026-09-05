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

type Svc = ReturnType<typeof createServiceClient>;

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
    const { photo, searchQuery } = await pickLibraryPhoto(svc, courseSummary(draft));
    if (photo) return { url: photo.url, source: "library" };

    const pexels = await searchPexelsPhoto(searchQuery);
    if (pexels) return { url: pexels.url, source: "pexels" };
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
    const colors = getProgramBySlug(programSlug).colors;
    const prompt = `Flat vector-style editorial illustration for a tech-education course cover, 16:9.
Subject: ${draft.name}. ${draft.description?.slice(0, 300) ?? ""}
Style: near-black matte ground subtly tinted toward ${colors.primary}, one or two large soft radial glows in ${colors.accent} behind the subject, a faint dot grid on one side. Centered bespoke flat illustration of the course subject built from simple geometric shapes, tilted about 3 degrees, with small in-world details and highlights in ${colors.accent} plus a muted green secondary. Modern, matte, confident. Absolutely no text, no letters, no words, no logos, no watermarks, no photorealism, no rainbow gradients.`;

    const { image } = await generateImage({
      model: gateway.imageModel(IMAGE_MODEL),
      prompt,
      aspectRatio: "16:9",
    });

    const path = `covers/${crypto.randomUUID()}.png`;
    const { error } = await svc.storage
      .from("landing")
      .upload(path, Buffer.from(image.uint8Array), { contentType: "image/png" });
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
