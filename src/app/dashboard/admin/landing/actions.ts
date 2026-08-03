"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasCapability } from "@/lib/roles";
import { toSlug } from "@/lib/programs/slug";
import type { ScheduleDay, LandingPartner } from "@/lib/landing-pages";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!hasCapability(student?.role ?? "", "switch_programs")) {
    throw new Error("Not authorized");
  }
  return svc;
}

/** The full editable shape posted from the builder form. Mirrors the
 *  landing_pages columns the LandingPage type exposes. */
export type LandingPageInput = {
  slug: string;
  published: boolean;
  headerLabel: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  accent: string;
  formLabel: string;
  trackSlug: string;
  eventbriteEventId: string;
  embedHeight: number | null;
  schedule: ScheduleDay[];
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  partners: LandingPartner[];
  heroImageUrl: string;
  footerText: string;
  metaTitle: string;
  metaDescription: string;
};

export type SaveLandingResult =
  | { success: true; slug: string }
  | { success: false; error: string };

const trimToNull = (v: string) => {
  const t = v.trim();
  return t.length ? t : null;
};

/**
 * Create or update a landing page, keyed by slug. Upserts on the slug column so
 * editing an existing page overwrites it and a brand-new slug inserts a row —
 * no code deploy needed for either. `originalSlug` lets an edit rename the slug
 * (we upsert under the new slug and delete the old row).
 */
export async function saveLandingPageAction(
  input: LandingPageInput,
  originalSlug?: string,
): Promise<SaveLandingResult> {
  const svc = await requireSuperAdmin();

  const slug = toSlug(input.slug);
  if (!slug) return { success: false, error: "A valid slug is required." };
  if (!input.headline.trim()) return { success: false, error: "Headline is required." };

  const accent = input.accent.trim();
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { success: false, error: "Accent must be a 6-digit hex color (e.g. #1D59FF)." };
  }

  // Sanitize the repeatable lists: drop rows the user left blank.
  const schedule: ScheduleDay[] = (input.schedule ?? [])
    .map((s) => ({ label: s.label.trim(), title: s.title.trim() }))
    .filter((s) => s.label || s.title);

  const partners: LandingPartner[] = (input.partners ?? [])
    .map((p): LandingPartner | null => {
      if (p.kind === "image") {
        const src = p.src.trim();
        if (!src) return null;
        return { kind: "image", src, alt: p.alt.trim(), ...(p.height ? { height: p.height } : {}) };
      }
      const label = p.label.trim();
      if (!label) return null;
      return { kind: "wordmark", label, ...(p.height ? { height: p.height } : {}) };
    })
    .filter((p): p is LandingPartner => p !== null);

  // If the slug changed during an edit, make sure we're not overwriting a
  // different existing page.
  if (originalSlug && originalSlug !== slug) {
    const { data: clash } = await svc
      .from("landing_pages")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) {
      return { success: false, error: `A landing page with slug "${slug}" already exists.` };
    }
  }

  const row = {
    slug,
    published: input.published,
    header_label: input.headerLabel.trim() || "BCC Academy",
    eyebrow: trimToNull(input.eyebrow),
    headline: input.headline.trim(),
    subhead: trimToNull(input.subhead),
    accent: accent || "#1a1a1a",
    form_label: trimToNull(input.formLabel),
    track_slug: trimToNull(input.trackSlug),
    eventbrite_event_id: trimToNull(input.eventbriteEventId),
    embed_height: input.embedHeight && input.embedHeight > 0 ? input.embedHeight : null,
    schedule,
    secondary_cta_label: trimToNull(input.secondaryCtaLabel),
    secondary_cta_url: trimToNull(input.secondaryCtaUrl),
    partners,
    hero_image_url: trimToNull(input.heroImageUrl),
    footer_text: trimToNull(input.footerText),
    meta_title: trimToNull(input.metaTitle),
    meta_description: trimToNull(input.metaDescription),
    updated_at: new Date().toISOString(),
  };

  const { error } = await svc
    .from("landing_pages")
    .upsert(row, { onConflict: "slug" });

  if (error) {
    console.error("[saveLandingPageAction] upsert failed:", error);
    return { success: false, error: "Failed to save landing page. Please try again." };
  }

  // Slug rename: remove the stale row now that the new one is in place.
  if (originalSlug && originalSlug !== slug) {
    const { error: delError } = await svc
      .from("landing_pages")
      .delete()
      .eq("slug", originalSlug);
    if (delError) {
      console.error("[saveLandingPageAction] old-slug cleanup failed:", delError);
    }
    revalidatePath(`/bcc/${originalSlug}`);
  }

  revalidatePath("/dashboard/admin/landing");
  revalidatePath(`/bcc/${slug}`);
  return { success: true, slug };
}

export async function deleteLandingPageAction(
  slug: string,
): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();
  const { error } = await svc.from("landing_pages").delete().eq("slug", slug);
  if (error) {
    console.error("[deleteLandingPageAction] failed:", error);
    return { success: false, error: "Failed to delete landing page." };
  }
  revalidatePath("/dashboard/admin/landing");
  revalidatePath(`/bcc/${slug}`);
  return { success: true };
}

/**
 * Upload a landing-page image (hero/background) to the public `landing`
 * storage bucket and return its public URL for the hero-image field.
 */
export async function uploadLandingImageAction(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const svc = await requireSuperAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose an image file first." };
  }
  const types: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = types[file.type];
  if (!ext) return { success: false, error: "Use a JPG, PNG, or WebP image." };
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "Image must be under 8MB." };
  }

  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await svc.storage
    .from("landing")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) {
    console.error("[uploadLandingImageAction] failed:", error);
    return { success: false, error: "Upload failed. Please try again." };
  }
  return { success: true, url: svc.storage.from("landing").getPublicUrl(path).data.publicUrl };
}
