"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/programs/slug";
import { getEveryProgramConfig } from "@/lib/programs";
import { humanizeSlug } from "@/lib/utils";
import { embeddedProgramSlug } from "@/lib/landing-pages";
import type { ScheduleDay, LandingPartner, LandingSession, LandingSection } from "@/lib/landing-pages";
import {
  requireManager,
  resolveProgramForActor,
  allowedProgramIdsForActor,
  assertLandingPageInActorProgram,
  assertTrackInActorProgram,
} from "../actions-shared";

// Landing pages are a program-admin job, same tier as Manage Courses: a course
// with no landing page has no way for anyone to sign up for it. requireManager
// proves the actor is admin+ somewhere; the boundary helpers bind every read
// and write to the actor's own program(s), so a BGC admin edits BGC pages and
// never sees a Catalyst draft. super_admins and the master pass every boundary.
const requireLandingManager = requireManager;

/** The full editable shape posted from the builder form. Mirrors the
 *  landing_pages columns the LandingPage type exposes. */
export type LandingPageInput = {
  slug: string;
  /** Owning program's slug, or "" for a platform page. Drives the page's URL:
   *  a page with a program is served at /<program-slug>/<slug>. */
  programSlug: string;
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
  logoUrl: string;
  /** "dark" or "" (light). */
  pageTheme: string;
  footerText: string;
  metaTitle: string;
  metaDescription: string;
  /** MASS-style native enrollment: pick-a-cohort form instead of the bare email box. */
  nativeEnroll: boolean;
  /** Interest capture only — the signup form enrolls no one. */
  comingSoon: boolean;
  /** Cohort dates offered by the native form. */
  sessions: LandingSession[];
  enrollCtaLabel: string;
  /** Detailed blocks under the form ("Why it matters", "What you'll build"). */
  bodySections: LandingSection[];
  instructor: { name: string; role: string; bio: string; photoUrl: string };
};

export type SaveLandingResult =
  | { success: true; slug: string; courseSlug: string; courseCreated: boolean }
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
  const actor = await requireLandingManager();
  const { svc } = actor;

  const slug = toSlug(input.slug);
  if (!slug) return { success: false, error: "A valid slug is required." };
  if (!input.headline.trim()) return { success: false, error: "Headline is required." };

  // Boundary, before anything is written. The upsert is keyed on slug, so a
  // program admin posting a slug that already exists under another program
  // would otherwise overwrite that program's page. Both the row being edited
  // and the row at the target slug must be theirs.
  for (const s of [...new Set([originalSlug, slug].filter((v): v is string => !!v))]) {
    const { data: existing } = await svc
      .from("landing_pages")
      .select("program_id")
      .eq("slug", s)
      .maybeSingle<{ program_id: string | null }>();
    if (existing) assertLandingPageInActorProgram(actor, existing);
  }

  const accent = input.accent.trim();
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { success: false, error: "Accent must be a 6-digit hex color (e.g. #1D59FF)." };
  }

  // Sanitize the repeatable lists: drop rows the user left blank.
  const schedule: ScheduleDay[] = (input.schedule ?? [])
    .map((s) => ({ label: s.label.trim(), title: s.title.trim() }))
    .filter((s) => s.label || s.title);

  // Keep the dates: the importer/generator stamps startUtc/endUtc/timezone on
  // each session and the confirmation email's calendar links read them. The
  // form doesn't edit them, so a save must not strip them.
  const sessions: LandingSession[] = (input.sessions ?? [])
    .map((x) => ({
      id: x.id.trim(),
      label: x.label.trim(),
      startUtc: x.startUtc ?? null,
      endUtc: x.endUtc ?? null,
      timezone: x.timezone ?? null,
    }))
    .filter((x) => x.id && x.label);

  // Only the FIRST emphasized section keeps the flag — a second dark band
  // turns the page's spine into stripes, and the form can't enforce that
  // across rows on its own.
  let emphasisTaken = false;
  const bodySections: LandingSection[] = (input.bodySections ?? [])
    .map((x) => ({ heading: x.heading.trim(), body: x.body.trim(), emphasis: x.emphasis }))
    .filter((x) => x.heading && x.body)
    .map((x) => {
      const emphasis = Boolean(x.emphasis) && !emphasisTaken;
      if (emphasis) emphasisTaken = true;
      return emphasis ? { ...x, emphasis: true } : { heading: x.heading, body: x.body };
    });

  const instructorName = input.instructor?.name.trim() ?? "";
  const instructor = instructorName
    ? {
        name: instructorName,
        role: trimToNull(input.instructor.role),
        bio: input.instructor.bio.trim(),
        photoUrl: trimToNull(input.instructor.photoUrl),
      }
    : null;

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

  // The owning program is what the URL brand segment is derived from, so an
  // unknown slug has to fail loudly rather than silently publish the page back
  // under /bcc/.
  let programId: string | null = null;
  const wantedProgram = input.programSlug?.trim();
  if (wantedProgram) {
    // Throws when the actor may not act in that program (super_admins pass).
    try {
      programId = await resolveProgramForActor(actor, svc, wantedProgram);
    } catch {
      return { success: false, error: `No program with slug "${wantedProgram}".` };
    }
  } else if (allowedProgramIdsForActor(actor) !== null) {
    // A platform page (/bcc/<slug>) belongs to no program, so no program admin
    // can own one.
    return { success: false, error: "Choose the program this page belongs to." };
  }

  // A landing page enrolls people into a course, so it must HAVE one — and one
  // that exists. Before this, "track slug" was an optional free-text tag: the
  // MASS page got pointed at the spring wraparound's slug and a new cohort's
  // signups landed on last season's roster (2026-08-18). Now: no slug → the
  // page's own slug; unknown slug → a course is created for it, named after
  // the page, under the page's program (Catalyst for a platform page),
  // unscheduled until you set dates in Manage Courses.
  const trackSlug = toSlug(input.trackSlug?.trim() || slug);
  if (!trackSlug) return { success: false, error: "Could not derive a course slug." };
  // An existing course must be one the actor may act in — otherwise a program
  // admin could point their page at another program's course and enroll
  // signups into it. A course that doesn't exist yet is created in the
  // page's own program below.
  if (await courseExists(svc, trackSlug)) {
    try {
      await assertTrackInActorProgram(actor, svc, trackSlug);
    } catch {
      return { success: false, error: "That course belongs to another program." };
    }
  }
  const course = await ensureCourseForLanding(svc, trackSlug, input.headline.trim(), programId);
  if (!course.ok) return { success: false, error: course.error };

  const row = {
    slug,
    program_id: programId,
    published: input.published,
    header_label: input.headerLabel.trim() || "BCC Academy",
    eyebrow: trimToNull(input.eyebrow),
    headline: input.headline.trim(),
    subhead: trimToNull(input.subhead),
    accent: accent || "#1a1a1a",
    form_label: trimToNull(input.formLabel),
    track_slug: trackSlug,
    eventbrite_event_id: trimToNull(input.eventbriteEventId),
    embed_height: input.embedHeight && input.embedHeight > 0 ? input.embedHeight : null,
    schedule,
    secondary_cta_label: trimToNull(input.secondaryCtaLabel),
    secondary_cta_url: trimToNull(input.secondaryCtaUrl),
    partners,
    hero_image_url: trimToNull(input.heroImageUrl),
    logo_url: trimToNull(input.logoUrl),
    page_theme: input.pageTheme === "dark" ? "dark" : null,
    footer_text: trimToNull(input.footerText),
    meta_title: trimToNull(input.metaTitle),
    meta_description: trimToNull(input.metaDescription),
    native_enroll: input.nativeEnroll && sessions.length > 0,
    coming_soon: input.comingSoon,
    sessions,
    enroll_cta_label: trimToNull(input.enrollCtaLabel),
    body_sections: bodySections,
    instructor,
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
    if (wantedProgram) revalidatePath(`/${wantedProgram}/${originalSlug}`);
  }

  revalidatePath("/dashboard/admin/landing");
  // Both paths: one is canonical, the other redirects to it, and which is which
  // changes the moment a program is set or cleared.
  revalidatePath(`/bcc/${slug}`);
  if (wantedProgram) revalidatePath(`/${wantedProgram}/${slug}`);
  if (course.created) revalidatePath("/dashboard/admin/programs");
  return { success: true, slug, courseSlug: trackSlug, courseCreated: course.created };
}

/** Known anywhere already: the TS registry or a Course Builder row. */
async function courseExists(
  svc: ReturnType<typeof createServiceClient>,
  trackSlug: string,
): Promise<boolean> {
  if (getEveryProgramConfig().some((p) => p.tracks.some((t) => t.slug === trackSlug))) return true;
  const { data: existing } = await svc
    .from("track_overrides")
    .select("id")
    .eq("track_slug", trackSlug)
    .maybeSingle();
  return !!existing;
}

/**
 * Make sure a course exists for a landing page's track slug. Looks in the TS
 * registry and track_overrides; if absent, creates a track_overrides row under
 * the page's program — Catalyst (the umbrella, same default as
 * createCourseAction) for a platform page — with the landing page's headline
 * as the name and no schedule. Idempotent.
 */
async function ensureCourseForLanding(
  svc: ReturnType<typeof createServiceClient>,
  trackSlug: string,
  fallbackName: string,
  programId: string | null,
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  if (await courseExists(svc, trackSlug)) return { ok: true, created: false };

  const { data: prog } = programId
    ? { data: { id: programId } }
    : await svc
        .from("programs")
        .select("id")
        .eq("slug", "catalyst")
        .maybeSingle<{ id: string }>();
  if (!prog) return { ok: false, error: "Could not find the Catalyst program to file the new course under." };

  // Course name: the page slug humanized beats a marketing headline
  // ("Your story gets you the offer." is not a course name).
  const name = humanizeSlug(trackSlug) || fallbackName;
  const { error } = await svc.from("track_overrides").insert({
    program_id: prog.id,
    track_slug: trackSlug,
    name,
    short_name: name,
    instructor: "",
    total_weeks: 8,
    sessions_per_week: 1,
    start_date: null,
    phase: "core",
  });
  if (error) {
    console.error("[ensureCourseForLanding] insert failed:", error);
    return { ok: false, error: "Landing page saved but its course could not be created. Please try again." };
  }
  return { ok: true, created: true };
}

export async function deleteLandingPageAction(
  slug: string,
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireLandingManager();
  const { svc } = actor;
  const { data: existing } = await svc
    .from("landing_pages")
    .select("program_id, programs(slug)")
    .eq("slug", slug)
    .maybeSingle<{ program_id: string | null; programs: unknown }>();
  if (existing) assertLandingPageInActorProgram(actor, existing);
  const { error } = await svc.from("landing_pages").delete().eq("slug", slug);
  if (error) {
    console.error("[deleteLandingPageAction] failed:", error);
    return { success: false, error: "Failed to delete landing page." };
  }
  revalidatePath("/dashboard/admin/landing");
  revalidatePath(`/bcc/${slug}`);
  const programSlug = embeddedProgramSlug(existing?.programs);
  if (programSlug) revalidatePath(`/${programSlug}/${slug}`);
  return { success: true };
}

/**
 * Upload a landing-page image (hero/background) to the public `landing`
 * storage bucket and return its public URL for the hero-image field.
 */
export async function uploadLandingImageAction(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const { svc } = await requireLandingManager();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose an image file first." };
  }
  const types: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  const ext = types[file.type];
  if (!ext) {
    return { success: false, error: "Use a JPG, PNG, WebP, or SVG image, or an MP4/WebM/MOV video." };
  }
  const isVideo = file.type.startsWith("video/");
  // Video gets a higher cap: it can't be compressed in the browser the way
  // images are, and a short hero loop runs 10-30MB.
  const maxBytes = (isVideo ? 40 : 8) * 1024 * 1024;
  if (file.size > maxBytes) {
    return { success: false, error: `${isVideo ? "Video" : "Image"} must be under ${isVideo ? 40 : 8}MB.` };
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
