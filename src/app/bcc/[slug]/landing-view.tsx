import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import { getLandingPage, landingPath, landingPrefix } from "@/lib/landing-pages";
import { getProgramBySlug } from "@/lib/programs";
import { CampEmailForm } from "../_components/camp-email-form";
import { CampEnrollForm } from "../_components/camp-enroll-form";
import { CampEventbriteRegister } from "../_components/camp-eventbrite-register";
import { HeroVideo } from "../_components/hero-video";
import { CampHeaderCta } from "../_components/camp-header-cta";
import { MobileRegisterBar } from "../_components/mobile-register-bar";
import { RichText } from "../_components/rich-text";
import { RegisterForm } from "@/app/events/[slug]/register/register-form";
import { formatEventWhen } from "@/lib/events";
import { getEventForLanding } from "@/lib/events-server";
import { seatsTaken } from "@/lib/events-waitlist";

// The one implementation of a campaign landing page. Two routes render it:
// /bcc/[slug] (platform pages, and the legacy path for everything) and
// /[program]/[slug] (a page that belongs to a program wears that program's
// slug). Both call through here so the two URLs can never drift apart.

export async function buildLandingMetadata(slug: string): Promise<Metadata> {
  const page = await getLandingPage(slug);
  if (!page) return { title: "Not found" };

  const title = page.metaTitle ?? page.headline.replace(/\n/g, " ");
  const description = page.metaDescription ?? page.subhead ?? undefined;

  // Per-page social card: prefer og_image, fall back to the hero. Relative
  // paths are made absolute so scrapers can fetch them.
  const rawImage = page.ogImage ?? page.heroImageUrl;
  const image = rawImage?.startsWith("/")
    ? `https://bccacademy.io${rawImage}`
    : rawImage ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      // Canonical URL follows the owning program, so a shared card never
      // advertises the redirecting path.
      url: `https://bccacademy.io${landingPath(page)}`,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export async function LandingView({
  slug,
  prefix,
}: {
  slug: string;
  /** The brand segment this request came in under. */
  prefix: string;
}) {
  const page = await getLandingPage(slug);
  if (!page) notFound();

  // One canonical URL per page. A page that belongs to a program lives at
  // /<program-slug>/<slug>; everything else stays at /bcc/<slug>. Arriving
  // under the other prefix redirects rather than 404s, because the old path is
  // already on flyers, in inboxes, and in link previews.
  const canonical = landingPrefix(page);
  if (prefix !== canonical) redirect(landingPath(page));

  const accent = page.accent;

  // Phase 6: a landing page that hosts an event renders the multi-attendee
  // registration form in its signup slot instead of the cohort/email form.
  const event = page.eventSlug ? await getEventForLanding(page.eventSlug, page.programSlug) : null;
  const spotsLeft = event && event.capacity != null ? Math.max(0, event.capacity - (await seatsTaken(event.id))) : null;
  const eventFull = spotsLeft === 0 && !!event && !event.waitlist_enabled;

  // Per-page theme: `dark` flips the page onto logo black with cream ink.
  // INK stays 6-digit hex so the 2-digit alpha suffixes below compose.
  const dark = page.pageTheme === "dark";
  const INK = dark ? "#fffdf7" : "#1a1a1a";
  const BG = dark ? "#181818" : "#f5f5f7";

  // Ground for the one emphasized section a page may carry — the field, the
  // same object as the session stage and the home band. It is the most
  // brand-carrying thing on the page, so it is lit from the program's own deep
  // tone (BGC's #1E1035) rather than a generic black stripe. A platform page
  // has no palette of its own, so it lights the field from the page's accent —
  // near-black ink would give a grey gradient with grey dots, which is the flat
  // stripe this replaced wearing a texture. On an already-dark page the band
  // would disappear, so it lifts to the accent's own tone.
  const programColors = page.programSlug
    ? getProgramBySlug(page.programSlug).colors
    : undefined;
  const fieldBase = dark ? "#241645" : (programColors?.ground ?? accent);
  const onGround = "#fffdf7";
  // Phone-only sticky bar that jumps to the signup form (or straight to an
  // external apply link). Nothing to offer when the event is full or closed.
  const stickyCta = ((): { label: string; href?: string } | null => {
    if (event) {
      if (event.status === "closed" || eventFull) return null;
      return { label: spotsLeft === 0 ? "Join the waitlist" : "Register" };
    }
    if (page.applyUrl) return { label: page.applyCtaLabel ?? "Apply now", href: page.applyUrl };
    if (page.comingSoon) return { label: "Notify me" };
    if (page.eventbriteEventId) return { label: "Get tickets" };
    if (page.nativeEnroll) return { label: page.enrollCtaLabel ?? "Enroll" };
    return { label: "Sign up" };
  })();
  return (
    <div
      className="min-h-[100dvh] flex flex-col md:flex-row"
      style={{ backgroundColor: BG, color: INK }}
    >
      {/* ── Left: content panel ── */}
      <div className={`flex flex-col flex-1 md:min-h-[100dvh] ${stickyCta ? "max-md:pb-24" : ""}`}>
        {/* Header. On a phone the hero banner above already carries the
           program lockup, so this label row would be a third identity line
           between the art and the headline; it returns at md, where the
           banner moves to the side. */}
        <header
          className={`items-center justify-between px-6 py-5 md:flex md:px-12 ${page.heroImageUrl ? "hidden" : "flex"}`}
          style={{ borderBottom: `1px solid ${INK}0d` }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: `${INK}a6` }}
          >
            {page.headerLabel}
          </span>
          <CampHeaderCta ink={INK} />
        </header>

        {/* Main content */}
        <main className="flex flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-12">
          {/* A flex column so a phone can reorder it: pitch first, form last
             (see the signup block). Desktop keeps source order. */}
          <div className="flex flex-col" style={{ maxWidth: "460px" }}>
            {page.logoUrl && !page.heroImageUrl && (
              // The program's own lockup, for pages with no hero. When there
              // is a hero it lives ON the art at every width (see below),
              // where it has room to be read. Height-capped rather than
              // width-capped: these are usually stacked marks, and a width cap
              // makes a tall one swallow the fold.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.logoUrl}
                alt=""
                className="mb-6 h-auto w-auto max-h-28 max-w-[200px] object-contain object-left"
              />
            )}
            {page.eyebrow && (
              <p
                className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: accent }}
              >
                {page.eyebrow}
              </p>
            )}

            <h1
              className="font-bold leading-[1.0] tracking-tight"
              style={{
                fontSize: "clamp(34px, 4vw, 48px)",
                color: `${INK}`,
              }}
            >
              {page.headline.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>

            {page.subhead && (
              <RichText
                text={page.subhead}
                className="mt-4 text-sm leading-relaxed"
                style={{ color: `${INK}b3`, maxWidth: "42ch" }}
              />
            )}

            {event && (
              // The three facts a parent decides on: when, where, how many
              // seats. They stay with the headline at every width; on a phone
              // the form itself lands after the pitch.
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border px-2.5 py-1" style={{ borderColor: `${INK}26`, color: `${INK}b3` }}>
                  {formatEventWhen(event.starts_at, event.ends_at, event.timezone)}
                </span>
                {(event.location || event.join_url) && (
                  <span className="rounded-full border px-2.5 py-1" style={{ borderColor: `${INK}26`, color: `${INK}b3` }}>
                    {event.location ?? "Online"}
                  </span>
                )}
                {spotsLeft != null && (
                  <span
                    className="rounded-full px-2.5 py-1"
                    style={spotsLeft > 0 ? { background: "rgba(31,211,122,.16)", color: "#0d6b3d" } : { background: `${INK}14`, color: `${INK}b3` }}
                  >
                    {spotsLeft > 0
                      ? `${spotsLeft} of ${event.capacity} seat${event.capacity === 1 ? "" : "s"} left`
                      : event.waitlist_enabled
                        ? "Full · waitlist open"
                        : "Full"}
                  </span>
                )}
              </div>
            )}

            {/* Signup. From md it sits directly under the pitch, because
               almost nobody reads to the bottom of a landing page before
               deciding; the long explanation is below for those who want it.
               On a phone the same form is a 2,000px wall between the headline
               and everything that sells the event, so it moves to the end of
               the column (flex order) and the sticky bar at the bottom of the
               screen keeps it one tap away. Keeps id="signup" so older links
               still land here. */}
            <div id="signup" className="mt-8 max-md:order-1 max-md:mt-12">
              {page.formLabel && (
                <p
                  className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: `${INK}a6` }}
                >
                  {page.formLabel}
                </p>
              )}
              {event ? (
                <div>
                  {event.status === "closed" || eventFull ? (
                    <p className="rounded-lg border px-4 py-5 text-sm" style={{ borderColor: `${INK}26`, color: `${INK}b3` }}>
                      {eventFull ? "This event is full." : "Registration for this event is closed."}
                    </p>
                  ) : (
                    <RegisterForm
                      embedded
                      eventSlug={event.slug}
                      eventTitle={event.title}
                      maxAttendees={event.max_attendees_per_registration}
                      spotsLeft={spotsLeft}
                    />
                  )}
                </div>
              ) : page.comingSoon ? (
                <CampEnrollForm
                  ink={INK}
                  slug={page.slug}
                  sessions={[]}
                  accent={accent}
                  ctaLabel="Notify me"
                  comingSoon
                />
              ) : page.applyUrl ? (
                <a
                  href={page.applyUrl}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: accent }}
                >
                  {page.applyCtaLabel ?? "Apply now"}
                  <span aria-hidden="true">→</span>
                </a>
              ) : page.eventbriteEventId ? (
                <CampEventbriteRegister
                  ink={INK}
                  eventId={page.eventbriteEventId}
                  accent={accent}
                  height={page.embedHeight}
                />
              ) : page.nativeEnroll ? (
                <CampEnrollForm
                  ink={INK}
                  slug={page.slug}
                  sessions={page.sessions}
                  accent={accent}
                  ctaLabel={page.enrollCtaLabel}
                />
              ) : (
                <CampEmailForm ink={INK} accent={accent} trackSlug={page.trackSlug} />
              )}
            </div>

            {/* Schedule */}
            {page.schedule.length > 0 && (
              <>
                <div className="mt-10 mb-7" style={{ height: "1px", background: `${INK}12` }} />
                <div className="space-y-4">
                  {page.schedule.map((item) => (
                    <div key={item.label} className="flex items-baseline gap-5">
                      <span
                        // The dates were ink at ~27% alpha — nearly invisible
                        // beside the session titles, on a page whose whole job
                        // is telling someone which five days to hold.
                        className="text-xs font-bold uppercase tracking-[0.1em] shrink-0"
                        style={{ color: `${INK}`, minWidth: "104px" }}
                      >
                        {item.label}
                      </span>
                      <span className="font-semibold" style={{ color: `${INK}`, fontSize: "16px" }}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Detailed content — overview, what you'll learn, etc.
                Headings are real headings (22px, ink) rather than the 11px
                accent kickers this used to use: with a kicker as the only
                heading there was no size between body and the page headline,
                so an eight-section page read as eight identical grey blocks.
                Ink headings also keep the accent scarce enough to mean
                something. One section may set `emphasis` to sit on the
                program's dark ground — the spine of a long page. */}
            {page.bodySections.length > 0 && (
              <div className="mt-12">
                {page.bodySections.map((section, i) => {
                  const lead = i === 0;
                  if (section.emphasis) {
                    return (
                      <div
                        key={i}
                        // The field, not a flat stripe — the same object as
                        // the session stage and the home band. Lit from this
                        // page's own tone rather than a hardcoded cobalt, so a
                        // BGC page comes out purple with no extra CSS.
                        className="stage-surface stage-grid relative isolate mt-9 overflow-hidden rounded-2xl px-6 py-7"
                        style={
                          {
                            color: onGround,
                            "--primary": accent,
                            "--stage-base": fieldBase,
                          } as CSSProperties
                        }
                      >
                        <div className="relative">
                          <h2 className="text-[22px] font-bold leading-[1.15] tracking-[-0.01em]">
                            {section.heading}
                          </h2>
                          <RichText
                            text={section.body}
                            className="mt-3 text-[17px] leading-[1.6]"
                            style={{ color: `${onGround}c4` }}
                          />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className={lead ? "" : "mt-9 pt-9"}
                      style={lead ? undefined : { borderTop: `1px solid ${INK}12` }}
                    >
                      <h2
                        className="text-[22px] font-bold leading-[1.2] tracking-[-0.01em]"
                        style={{ color: INK }}
                      >
                        {section.heading}
                      </h2>
                      <RichText
                        text={section.body}
                        className="mt-2.5 max-w-[62ch] text-[17px] leading-[1.62]"
                        style={{ color: `${INK}e0` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Instructor */}
            {page.instructor && (
              <div
                className="mt-10 flex items-start gap-4 rounded-2xl p-5"
                style={{ background: `${INK}08` }}
              >
                {page.instructor.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.instructor.photoUrl}
                    alt={page.instructor.name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                )}
                <div>
                  {page.instructor.role && (
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: accent }}
                    >
                      {page.instructor.role}
                    </p>
                  )}
                  <p className="text-[15px] font-semibold" style={{ color: `${INK}` }}>
                    {page.instructor.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: `${INK}99` }}>
                    {page.instructor.bio}
                  </p>
                </div>
              </div>
            )}

            {/* Secondary CTA */}
            {page.secondaryCtaLabel && page.secondaryCtaUrl && (
              <p className="mt-8 text-sm max-md:order-2" style={{ color: `${INK}a6` }}>
                <a
                  href={page.secondaryCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline underline-offset-2"
                  style={{ color: accent }}
                >
                  {page.secondaryCtaLabel}
                </a>
              </p>
            )}
          </div>
        </main>

        {/* Partner logos */}
        {page.partners.length > 0 && (
          <div className="px-6 py-6 md:px-12" style={{ borderTop: `1px solid ${INK}0d` }}>
            <p
              className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: `${INK}99` }}
            >
              Presented in partnership with
            </p>
            <div className="flex items-center gap-6">
              {page.partners.map((p, i) => (
                <span key={i} className="flex items-center gap-6">
                  {i > 0 && <span style={{ color: `${INK}18`, fontSize: "18px" }}>×</span>}
                  {p.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.src}
                      alt={p.alt}
                      style={{ height: `${p.height ?? 36}px`, width: "auto" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                        fontWeight: 900,
                        fontSize: `${(p.height ?? 26) + 2}px`,
                        letterSpacing: "-1px",
                        color: `${INK}`,
                      }}
                    >
                      {p.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {page.footerText && (
          <footer className="px-6 py-4 md:px-12" style={{ borderTop: `1px solid ${INK}0d` }}>
            <p className="text-[11px]" style={{ color: `${INK}99` }}>
              {page.footerText}
            </p>
          </footer>
        )}
      </div>

      {/* ── Right: image panel. On a phone it is the first thing on the
         page: a full-bleed 4:3 banner (wider on a tablet) above the headline,
         carrying the lockup. From md it moves beside the copy at 52% and
         sticks for the whole scroll. ── */}
      {page.heroImageUrl && (
        <div
          className="relative overflow-hidden max-md:order-first max-md:w-full max-md:aspect-[4/3] sm:max-md:aspect-[2/1] md:sticky md:top-0 md:h-[100dvh] md:w-[52%] md:min-w-[52%] md:max-w-[52%]"
          style={{ background: page.heroBg ?? undefined }}
        >
          {/* Hero media: video formats get a silent looping player (muted +
             playsInline are required for mobile autoplay), everything else
             stays an <img>. */}
          {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(page.heroImageUrl) ? (
            <HeroVideo src={page.heroImageUrl} fit={page.heroFit === "contain" ? "contain" : "cover"} />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={page.heroImageUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-center ${
                page.heroFit === "contain" ? "object-contain" : "object-cover"
              }`}
            />
          )}
          {page.logoUrl && (
            // The program lockup, over the hero. In the text column it sat at
            // 200px wide beside a full-height photo and read as an afterthought
            // — squeezed, and too small to make out a stacked mark. Here it has
            // the width of the image to breathe.
            //
            // Knocked to white with brightness(0) invert(1): the source asset
            // is a solid dark mark, so this flattens it to pure white rather
            // than needing a second uploaded file that can drift from the first.
            <div className="absolute left-5 top-5 w-[46%] md:left-10 md:top-10 md:w-[62%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.logoUrl}
                alt=""
                className="h-auto w-auto max-h-24 max-w-full object-contain object-left md:max-h-40 lg:max-h-52"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
          )}
          {page.sponsorLogoUrl && (
            <div className="absolute top-5 right-5 md:top-8 md:right-8">
              <span
                className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80"
              >
                In partnership with
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.sponsorLogoUrl}
                alt="Sponsor"
                className="mt-1.5 h-8 w-auto md:mt-2 md:h-12"
              />
            </div>
          )}
          {!page.logoUrl && (
            // No lockup to put on the art, so on the phone banner the header
            // label stands in for it (the header row itself is hidden there).
            // From md the label is back in the header row.
            <span
              className="absolute left-5 top-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white md:hidden"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,.35)" }}
            >
              {page.headerLabel}
            </span>
          )}
        </div>
      )}

      {stickyCta && (
        <MobileRegisterBar label={stickyCta.label} href={stickyCta.href} accent={accent} ink={INK} bg={BG} />
      )}
    </div>
  );
}
