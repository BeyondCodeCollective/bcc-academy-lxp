import { createServiceClient } from "@/lib/supabase/server";

export type ScheduleDay = { label: string; title: string };

export type LandingPartner =
  | { kind: "image"; src: string; alt: string; height?: number }
  | { kind: "wordmark"; label: string; height?: number };

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
  schedule: ScheduleDay[];
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  partners: LandingPartner[];
  heroImageUrl: string | null;
  footerText: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
};

/** Loads a published marketing landing page by slug (the /camp/[slug] template
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
    schedule: (data.schedule as ScheduleDay[] | null) ?? [],
    secondaryCtaLabel: (data.secondary_cta_label as string | null) ?? null,
    secondaryCtaUrl: (data.secondary_cta_url as string | null) ?? null,
    partners: (data.partners as LandingPartner[] | null) ?? [],
    heroImageUrl: (data.hero_image_url as string | null) ?? null,
    footerText: (data.footer_text as string | null) ?? null,
    metaTitle: (data.meta_title as string | null) ?? null,
    metaDescription: (data.meta_description as string | null) ?? null,
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
