import Link from "next/link";
import { careerPathways, type CareerPathway } from "@/data/marketing/careerPathways";

// Standalone career-pathway page — the cert ladder, role/salary progression,
// and capstone for one career track. This is the funder/parent-facing "where
// does this training lead" story that previously lived only inside quiz
// results. Rendered in the product design system (Archivo headings via the
// global rule, paper/ink, panel cards); the pathway's accent comes from data.

const LEVEL_LABEL: Record<string, string> = {
  foundational: "Foundational",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const STAGE_LABEL: Record<string, string> = {
  entry: "Entry",
  mid: "Mid-career",
  senior: "Senior",
};

const fmtK = (n: number) => `$${Math.round(n / 1000)}k`;

export function CareerPathwayView({ pathway }: { pathway: CareerPathway }) {
  const accent = pathway.accent;
  const others = Object.values(careerPathways).filter((p) => p.key !== pathway.key);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-14 pb-20 space-y-10">
        {/* Hero */}
        <header>
          <p
            className="font-mono text-xs uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            Career pathway · {pathway.shortName}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {pathway.name}
          </h1>
          <p className="mt-3 text-lg font-semibold text-ink">{pathway.tagline}</p>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {pathway.description}
          </p>
          {pathway.status === "in-design" && (
            <p className="mt-4 inline-flex rounded-full bg-paper-tint px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              In design — launching soon
            </p>
          )}
        </header>

        {/* WEF signals */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Fastest-growing roles · WEF Future of Jobs
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {pathway.wefRoles.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Fastest-growing skills · WEF Future of Jobs
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {pathway.wefSkills.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Certification ladder */}
        <section>
          <h2 className="text-xl font-bold tracking-tight">The certification ladder</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Recognized credentials, in the order employers expect them.
          </p>
          <ol className="mt-5 space-y-3">
            {pathway.certLadder.map((cert, i) => (
              <li key={cert.name} className="panel flex items-start gap-4 p-4 sm:p-5">
                <span
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-mono text-[13px] text-white tabular-nums"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-[15px] font-bold">{cert.name}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      {LEVEL_LABEL[cert.level] ?? cert.level}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {cert.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Role & salary progression */}
        <section>
          <h2 className="text-xl font-bold tracking-tight">Where it leads</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Typical role progression and salary ranges (US).
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pathway.roleProgression.map((role) => (
              <div key={role.title} className="panel p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  {STAGE_LABEL[role.level] ?? role.level}
                </p>
                <p className="mt-1.5 text-[15px] font-bold leading-snug">{role.title}</p>
                <p className="mt-2 font-mono text-sm text-ink-soft tabular-nums">
                  {fmtK(role.salary.low)}–{fmtK(role.salary.high)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Skills built */}
        <section>
          <h2 className="text-xl font-bold tracking-tight">Skills you build</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {pathway.skillsBuilt.map((s) => (
              <span
                key={s}
                className="rounded-full bg-surface-elevated px-3.5 py-1.5 text-[13px] font-medium text-ink shadow-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Capstone */}
        <section className="panel p-6 sm:p-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Capstone
          </h2>
          <p className="mt-2 text-lg font-bold">{pathway.capstone.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {pathway.capstone.preview}
          </p>
        </section>

        {/* CTAs */}
        <section className="flex flex-wrap items-center gap-3">
          {pathway.key === "cybersecurity" && (
            <Link
              href="/bcc/cybersecurity"
              className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              See the funded Security+ cohort →
            </Link>
          )}
          <Link
            href="/quiz"
            className="inline-flex items-center rounded-full border border-rule bg-surface-elevated px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
          >
            Find your pathway — 60-second quiz
          </Link>
        </section>

        {/* Other pathways */}
        <footer className="border-t border-rule pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Other career pathways
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((p) => (
              <Link
                key={p.key}
                href={`/pathways/${p.key}`}
                className="rounded-full border border-rule bg-surface-elevated px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink-faint"
              >
                {p.shortName} →
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
