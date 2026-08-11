import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingPage } from "@/lib/landing-pages";
import { CampEmailForm } from "../_components/camp-email-form";
import { CampEnrollForm } from "../_components/camp-enroll-form";
import { CampEventbriteRegister } from "../_components/camp-eventbrite-register";
import { CampHeaderCta } from "../_components/camp-header-cta";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
      url: `https://bccacademy.io/bcc/${slug}`,
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

export default async function CampLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getLandingPage(slug);
  if (!page) notFound();

  const accent = page.accent;

  // Per-page theme: `dark` flips the page onto logo black with cream ink.
  // INK stays 6-digit hex so the 2-digit alpha suffixes below compose.
  const dark = page.pageTheme === "dark";
  const INK = dark ? "#fffdf7" : "#1a1a1a";
  const BG = dark ? "#181818" : "#f5f5f7";
  return (
    <div
      className="min-h-[100dvh] flex flex-col md:flex-row"
      style={{ backgroundColor: BG, color: INK }}
    >
      {/* ── Left: content panel ── */}
      <div className="flex flex-col flex-1 md:min-h-[100dvh]">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-5 md:px-12"
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
        <main className="flex flex-1 flex-col justify-center px-8 py-12 md:px-12">
          <div style={{ maxWidth: "460px" }}>
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
              <p
                className="mt-4 text-sm leading-relaxed"
                style={{ color: `${INK}b3`, maxWidth: "38ch" }}
              >
                {page.subhead}
              </p>
            )}

            {/* Email form */}
            <div className="mt-8">
              {page.formLabel && (
                <p
                  className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: `${INK}a6` }}
                >
                  {page.formLabel}
                </p>
              )}
              {page.applyUrl ? (
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

            {/* Detailed content — overview, what you'll learn, etc. */}
            {page.bodySections.length > 0 && (
              <div className="mt-10 space-y-6">
                {page.bodySections.map((section, i) => (
                  <div key={i}>
                    <h2
                      className="text-[13px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: accent }}
                    >
                      {section.heading}
                    </h2>
                    <p
                      className="mt-2 text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: `${INK}99` }}
                    >
                      {section.body}
                    </p>
                  </div>
                ))}
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
              <p className="mt-8 text-sm" style={{ color: `${INK}a6` }}>
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
          <div className="px-8 py-6 md:px-12" style={{ borderTop: `1px solid ${INK}0d` }}>
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
          <footer className="px-8 py-4 md:px-12" style={{ borderTop: `1px solid ${INK}0d` }}>
            <p className="text-[11px]" style={{ color: `${INK}99` }}>
              {page.footerText}
            </p>
          </footer>
        )}
      </div>

      {/* ── Right: image panel ── */}
      {page.heroImageUrl && (
        <div
          className="hidden md:block md:sticky md:top-0 md:h-[100dvh] relative overflow-hidden"
          style={{
            width: "52%",
            minWidth: "52%",
            maxWidth: "52%",
            background: page.heroBg ?? undefined,
          }}
        >
          {/* Hero media: video formats get a silent looping player (muted +
             playsInline are required for mobile autoplay), everything else
             stays an <img>. */}
          {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(page.heroImageUrl) ? (
            <video
              src={page.heroImageUrl}
              autoPlay
              muted
              loop
              playsInline
              crossOrigin="anonymous"
              className={`absolute inset-0 w-full h-full object-center ${
                page.heroFit === "contain" ? "object-contain" : "object-cover"
              }`}
            >
              {/* Sibling captions file; a missing track 404s silently. The
                 video is muted for autoplay, so captions carry the audio. */}
              <track kind="captions" srcLang="en" label="English" default src={`${page.heroImageUrl}.vtt`} />
            </video>
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
          {page.sponsorLogoUrl && (
            <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <span
                className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80"
              >
                In partnership with
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.sponsorLogoUrl}
                alt="Sponsor"
                className="mt-2 h-10 w-auto md:h-12"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
