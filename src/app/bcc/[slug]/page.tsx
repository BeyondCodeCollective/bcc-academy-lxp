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
  return {
    title: page.metaTitle ?? page.headline.replace(/\n/g, " "),
    description: page.metaDescription ?? page.subhead ?? undefined,
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

  return (
    <div
      className="min-h-[100dvh] flex flex-col md:flex-row"
      style={{ backgroundColor: "#f5f5f7", color: "#1a1a1a" }}
    >
      {/* ── Left: content panel ── */}
      <div className="flex flex-col flex-1 md:min-h-[100dvh]">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-5 md:px-12"
          style={{ borderBottom: "1px solid #1a1a1a0d" }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#1a1a1a55" }}
          >
            {page.headerLabel}
          </span>
          <CampHeaderCta />
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
                color: "#1a1a1a",
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
                style={{ color: "#1a1a1a70", maxWidth: "38ch" }}
              >
                {page.subhead}
              </p>
            )}

            {/* Email form */}
            <div className="mt-8">
              {page.formLabel && (
                <p
                  className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: "#1a1a1a55" }}
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
                  eventId={page.eventbriteEventId}
                  accent={accent}
                  height={page.embedHeight}
                />
              ) : page.nativeEnroll ? (
                <CampEnrollForm
                  slug={page.slug}
                  sessions={page.sessions}
                  accent={accent}
                  ctaLabel={page.enrollCtaLabel}
                />
              ) : (
                <CampEmailForm accent={accent} trackSlug={page.trackSlug} />
              )}
            </div>

            {/* Schedule */}
            {page.schedule.length > 0 && (
              <>
                <div className="mt-10 mb-7" style={{ height: "1px", background: "#1a1a1a12" }} />
                <div className="space-y-4">
                  {page.schedule.map((item) => (
                    <div key={item.label} className="flex items-baseline gap-5">
                      <span
                        className="text-xs font-medium uppercase tracking-[0.1em] shrink-0"
                        style={{ color: "#1a1a1a44", minWidth: "104px" }}
                      >
                        {item.label}
                      </span>
                      <span className="font-semibold" style={{ color: "#1a1a1a", fontSize: "16px" }}>
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
                      style={{ color: "#1a1a1a99" }}
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
                style={{ background: "#1a1a1a08" }}
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
                  <p className="text-[15px] font-semibold" style={{ color: "#1a1a1a" }}>
                    {page.instructor.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "#1a1a1a99" }}>
                    {page.instructor.bio}
                  </p>
                </div>
              </div>
            )}

            {/* Secondary CTA */}
            {page.secondaryCtaLabel && page.secondaryCtaUrl && (
              <p className="mt-8 text-sm" style={{ color: "#1a1a1a55" }}>
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
          <div className="px-8 py-6 md:px-12" style={{ borderTop: "1px solid #1a1a1a0d" }}>
            <p
              className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "#1a1a1a38" }}
            >
              Presented in partnership with
            </p>
            <div className="flex items-center gap-6">
              {page.partners.map((p, i) => (
                <span key={i} className="flex items-center gap-6">
                  {i > 0 && <span style={{ color: "#1a1a1a18", fontSize: "18px" }}>×</span>}
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
                        color: "#1a1a1a",
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
          <footer className="px-8 py-4 md:px-12" style={{ borderTop: "1px solid #1a1a1a0d" }}>
            <p className="text-[11px]" style={{ color: "#1a1a1a38" }}>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.heroImageUrl}
            alt=""
            className={`absolute inset-0 w-full h-full object-center ${
              page.heroFit === "contain" ? "object-contain" : "object-cover"
            }`}
          />
        </div>
      )}
    </div>
  );
}
