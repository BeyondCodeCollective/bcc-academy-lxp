import { createServiceClient } from "@/lib/supabase/server";

export type ScheduleDay = { label: string; title: string };

export type LandingPartner =
  | { kind: "image"; src: string; alt: string; height?: number }
  | { kind: "wordmark"; label: string; height?: number };

/** A detailed-content block rendered below the hero (overview, what you'll
 *  learn, etc.). */
export type LandingSection = { heading: string; body: string };

/** The person leading the course, shown as a headshot + bio block. */
export type LandingInstructor = {
  name: string;
  role?: string | null;
  bio: string;
  photoUrl?: string | null;
};

/** A selectable session/cohort date for native enrollment. */
export type LandingSession = {
  id: string;
  label: string;
  startUtc?: string | null;
  endUtc?: string | null;
  timezone?: string | null;
};

/** The URL segment a landing page with no program is served under — the
 *  platform brand, Beyond Code Collective. */
export const PLATFORM_LANDING_PREFIX = "bcc";

/**
 * The brand segment a page's URL wears. A page that belongs to a program is
 * served under that program's slug (/bgc/<slug>); a page with no program is a
 * platform page and stays at /bcc/<slug>. Requesting the other prefix redirects
 * here, so a URL already on a flyer keeps working.
 */
export function landingPrefix(page: { programSlug: string | null }): string {
  return page.programSlug ?? PLATFORM_LANDING_PREFIX;
}

/** Canonical path for a page. */
export function landingPath(page: {
  programSlug: string | null;
  slug: string;
}): string {
  return `/${landingPrefix(page)}/${page.slug}`;
}

/** Slug out of an embedded `programs(slug)` join.
 *
 *  PostgREST returns a to-one embed as an object, but the client types it as an
 *  array. Reading only one shape would silently drop every page back onto
 *  /bcc/ if the other came back, so accept both. */
export function embeddedProgramSlug(v: unknown): string | null {
  const row = Array.isArray(v) ? v[0] : v;
  const slug = (row as { slug?: unknown } | null | undefined)?.slug;
  return typeof slug === "string" && slug ? slug : null;
}

export type LandingPage = {
  slug: string;
  /** Owning program's slug, or null for a platform page. Drives the URL. */
  programSlug: string | null;
  headerLabel: string;
  eyebrow: string | null;
  headline: string;
  subhead: string | null;
  accent: string;
  formLabel: string | null;
  trackSlug: string | null;
  /** Eventbrite event embedded on this page. NULL = use the email-magic-link form. */
  eventbriteEventId: string | null;
  /** Inline embed height override in px. NULL = component default (520). */
  embedHeight: number | null;
  schedule: ScheduleDay[];
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  partners: LandingPartner[];
  heroImageUrl: string | null;
  /** 'cover' fills+crops (photos); 'contain' fits the whole image (posters). */
  heroFit: "cover" | "contain";
  /** Letterbox background behind a 'contain' hero. */
  heroBg: string | null;
  /** "dark" flips the page onto logo black; null/anything else = light. */
  pageTheme: string | null;
  footerText: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  bodySections: LandingSection[];
  instructor: LandingInstructor | null;
  sessions: LandingSession[];
  /** When true, render the native pick-a-date + enroll form (no Eventbrite). */
  nativeEnroll: boolean;
  enrollCtaLabel: string | null;
  /** Application-based programs: primary CTA links here instead of a form. */
  applyUrl: string | null;
  applyCtaLabel: string | null;
  /** Social/OG card image; falls back to the hero image. */
  ogImage: string | null;
  /** Logo overlaid top-right of the hero (e.g. a white sponsor logo). */
  sponsorLogoUrl: string | null;
  /** The program's own logo, shown above the headline. */
  logoUrl: string | null;
};

/** Loads a published marketing landing page by slug (the /bcc/[slug] template
 *  reads this). Returns null if the slug doesn't exist or isn't published. */
export async function getLandingPage(slug: string): Promise<LandingPage | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_pages")
    // The owning program comes back on the same round-trip; its slug is the
    // page's URL brand segment.
    .select("*, programs(slug)")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!data) return null;

  return {
    slug: data.slug as string,
    programSlug: embeddedProgramSlug(data.programs),
    headerLabel: (data.header_label as string) ?? "BCC Academy",
    eyebrow: (data.eyebrow as string | null) ?? null,
    headline: data.headline as string,
    subhead: (data.subhead as string | null) ?? null,
    accent: (data.accent as string) ?? "#1a1a1a",
    formLabel: (data.form_label as string | null) ?? null,
    trackSlug: (data.track_slug as string | null) ?? null,
    eventbriteEventId: (data.eventbrite_event_id as string | null) ?? null,
    embedHeight: (data.embed_height as number | null) ?? null,
    schedule: (data.schedule as ScheduleDay[] | null) ?? [],
    secondaryCtaLabel: (data.secondary_cta_label as string | null) ?? null,
    secondaryCtaUrl: (data.secondary_cta_url as string | null) ?? null,
    partners: (data.partners as LandingPartner[] | null) ?? [],
    heroImageUrl: (data.hero_image_url as string | null) ?? null,
    heroFit: (data.hero_fit as string | null) === "contain" ? "contain" : "cover",
    heroBg: (data.hero_bg as string | null) ?? null,
    pageTheme: (data.page_theme as string | null) ?? null,
    footerText: (data.footer_text as string | null) ?? null,
    metaTitle: (data.meta_title as string | null) ?? null,
    metaDescription: (data.meta_description as string | null) ?? null,
    bodySections: (data.body_sections as LandingSection[] | null) ?? [],
    instructor: (data.instructor as LandingInstructor | null) ?? null,
    sessions: (data.sessions as LandingSession[] | null) ?? [],
    nativeEnroll: (data.native_enroll as boolean | null) ?? false,
    enrollCtaLabel: (data.enroll_cta_label as string | null) ?? null,
    applyUrl: (data.apply_url as string | null) ?? null,
    applyCtaLabel: (data.apply_cta_label as string | null) ?? null,
    ogImage: (data.og_image as string | null) ?? null,
    sponsorLogoUrl: (data.sponsor_logo_url as string | null) ?? null,
    logoUrl: (data.logo_url as string | null) ?? null,
  };
}

/** The hero image + accent from the landing page that feeds a track, so the
 *  in-portal holding page can echo the page the learner just registered on.
 *  Returns null if no published landing page points at this track. */
export async function getLandingHeroForTrack(
  trackSlug: string,
): Promise<{ heroImageUrl: string | null; accent: string } | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_pages")
    .select("hero_image_url, accent")
    .eq("track_slug", trackSlug)
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    heroImageUrl: (data.hero_image_url as string | null) ?? null,
    accent: (data.accent as string | null) ?? "#1D59FF",
  };
}

/** Reverse lookup: which published landing page embeds this Eventbrite event.
 *  The order.placed webhook only knows the event id, so this maps it back to the
 *  page's track. Returns the slug + track, or null if no page is wired to it. */
export async function getLandingByEventbriteId(
  eventbriteEventId: string,
): Promise<{ slug: string; trackSlug: string | null } | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_pages")
    .select("slug, track_slug")
    .eq("eventbrite_event_id", eventbriteEventId)
    .eq("published", true)
    .maybeSingle();
  if (!data) return null;
  return {
    slug: data.slug as string,
    trackSlug: (data.track_slug as string | null) ?? null,
  };
}

/**
 * Mirror of ensureCourseForLanding: give a freshly created course a landing
 * page at the same slug, so /bcc/<slug> exists to send people to.
 *
 * Created UNPUBLISHED, with no owning program — the admin picks the program
 * (which sets the URL brand segment) when they fill the page in. The copy is a
 * placeholder derived from the course name, and a live page carrying "Sign up
 * for X" with nothing else on it is worse than no page.
 *
 * Idempotent, and never steals a slug: if anything already occupies it, or a
 * page already points at this course, it leaves both alone.
 */
export async function ensureLandingForCourse(
  svc: ReturnType<typeof createServiceClient>,
  trackSlug: string,
  courseName: string,
  programSlug: string,
  /** Drafted copy from the course importer/generator, already reviewed by the
   *  admin. Absent for the manual builder, which keeps the bare stub. */
  content?: {
    headline?: string;
    subhead?: string;
    eyebrow?: string;
    bodySections?: LandingSection[];
    schedule?: ScheduleDay[];
  },
): Promise<{ created: boolean; slug: string | null }> {
  const { data: bySlug } = await svc
    .from("landing_pages")
    .select("slug")
    .eq("slug", trackSlug)
    .maybeSingle<{ slug: string }>();
  if (bySlug) return { created: false, slug: bySlug.slug };

  const { data: byTrack } = await svc
    .from("landing_pages")
    .select("slug")
    .eq("track_slug", trackSlug)
    .maybeSingle<{ slug: string }>();
  if (byTrack) return { created: false, slug: byTrack.slug };

  const { error } = await svc.from("landing_pages").insert({
    slug: trackSlug,
    published: false,
    header_label: "BCC Academy",
    headline: content?.headline?.trim() || courseName,
    subhead: content?.subhead?.trim() || null,
    eyebrow: content?.eyebrow?.trim() || null,
    track_slug: trackSlug,
    accent: "#1a1a1a",
    // No sessions yet (the course has no schedule until Edit Course sets one),
    // and native_enroll is only honoured with sessions, so leave it off rather
    // than shipping a signup form that can't take a date.
    native_enroll: false,
    schedule: content?.schedule ?? [],
    partners: [],
    sessions: [],
    body_sections: content?.bodySections ?? [],
    updated_at: new Date().toISOString(),
  });

  if (error) {
    // Never fail the course on this. The course is real and already saved; the
    // admin can add a landing page by hand from Manage Landing Pages.
    console.error(`[ensureLandingForCourse] insert failed for ${programSlug}/${trackSlug}:`, error);
    return { created: false, slug: null };
  }
  return { created: true, slug: trackSlug };
}
