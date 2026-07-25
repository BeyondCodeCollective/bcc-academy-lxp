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

export type LandingPage = {
  slug: string;
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
};

/** Loads a published marketing landing page by slug (the /bcc/[slug] template
 *  reads this). Returns null if the slug doesn't exist or isn't published. */
export async function getLandingPage(slug: string): Promise<LandingPage | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!data) return null;

  return {
    slug: data.slug as string,
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
