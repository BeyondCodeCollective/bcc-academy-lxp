import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Feature Set — BCC Academy",
  robots: { index: false, follow: false },
};

// Internal presentation page: everything the platform DOES, by capability —
// the companion to /platform-map (which shows every page) and /platform-brief
// (the strategy argument). Admin-only, standalone outside the dashboard shell,
// same pattern as its siblings: a stage, not a screen.

type Feature = {
  name: string;
  /** Short mono tag — where it lives or its state. */
  tag: string;
};
type Capability = { name: string; blurb: string; features: Feature[] };

const CAPABILITIES: Capability[] = [
  {
    name: "Multi-program white-label",
    blurb: "One codebase, five branded experiences — adding a partner is a row, not a rebuild.",
    features: [
      { name: "Per-program branding, courses & data", tag: "5 programs" },
      { name: "Super-admin program switcher", tag: "one click" },
      { name: "Live track edits — name, instructor, dates", tag: "no deploy" },
      { name: "Domain + cookie program resolution", tag: "automatic" },
    ],
  },
  {
    name: "Passwordless access",
    blurb: "Nobody — including a ten-year-old — ever types a password.",
    features: [
      { name: "Magic-link login", tag: "/login" },
      { name: "Durable one-click invite links", tag: "never expire" },
      { name: "Deferred auto-provisioning on first click", tag: "cohort + enrollment" },
      { name: "Signup allowlists per program", tag: "gated" },
    ],
  },
  {
    name: "Recruitment funnel",
    blurb: "From first click to enrolled student without a spreadsheet.",
    features: [
      { name: "Landing-page builder mapped to courses", tag: "staff-run" },
      { name: "Embedded Eventbrite checkout → instant account", tag: "webhook" },
      { name: "Funded-program applications", tag: "Security+" },
      { name: "Career quiz + pathway pages", tag: "/quiz" },
    ],
  },
  {
    name: "Live & recorded classrooms",
    blurb: "The session, the replay, and the work — one screen.",
    features: [
      { name: "Zoom embedded in the classroom, signed joins", tag: "real names" },
      { name: "YouTube-hosted recordings play natively", tag: "live today" },
      { name: "Day-based camp courses with holding pages", tag: "countdown" },
      { name: "Submissions, reflections & attendance per session", tag: "tracked" },
    ],
  },
  {
    name: "Data & analytics",
    blurb: "The answer to “did students actually grow?” — per student, provable.",
    features: [
      { name: "Surveys — public, in-app, claimed & deduped", tag: "one record" },
      { name: "Engagement funnel: invited → activated → active", tag: "per learner" },
      { name: "Cohort-tagged insights + CSV / PDF export", tag: "funder-ready" },
      { name: "Eventbrite registration funnel", tag: "live" },
    ],
  },
  {
    name: "Credentials",
    blurb: "The loop ends in something a hiring manager can click.",
    features: [
      { name: "Verifiable public certificate pages", tag: "no login" },
      { name: "Issue one or “Issue all” per course", tag: "admin" },
      { name: "Congratulations email with the link", tag: "automatic" },
      { name: "Program-branded official seal", tag: "SVG" },
    ],
  },
  {
    name: "Communication engine",
    blurb: "The platform owns the relationship — email is a feature, not a chore.",
    features: [
      { name: "Campaign sends with one-click login links", tag: "80 families" },
      { name: "Welcome, reminder & certificate emails", tag: "Resend" },
      { name: "Program-branded senders", tag: "white-label" },
      { name: "Send-state tracking, no double sends", tag: "idempotent" },
    ],
  },
  {
    name: "Safety & compliance",
    blurb: "Small in surface area, disproportionate in what it protects.",
    features: [
      { name: "Age-appropriate gating for youth camps", tag: "COPPA" },
      { name: "Participation agreements, tracked by cohort", tag: "signed" },
      { name: "Self-serve privacy withdrawal", tag: "/privacy" },
      { name: "Admin PII access audit log + CSP enforcement", tag: "always on" },
    ],
  },
  {
    name: "AI Tutor",
    blurb: "A tutor that knows their curriculum, awake at 9pm on a Tuesday.",
    features: [
      { name: "Curriculum-aware answers, streamed", tag: "24/7" },
      { name: "Per-program opt-in", tag: "Upskill Bahamas" },
      { name: "Lives inside the learner portal", tag: "/tutor" },
    ],
  },
];

export default async function PlatformFeaturesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/login");
  }

  const totalFeatures = CAPABILITIES.reduce((n, c) => n + c.features.length, 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-7 pb-24 pt-16">
        <header>
          <p
            className="text-xs uppercase tracking-[0.18em] text-primary"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            BCC Academy · The Feature Set
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Everything the
            <br />
            platform does.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            The map shows every page; this shows every capability. What we run
            today, in production, for every program on the platform.
          </p>
          <div
            className="mb-11 mt-6 flex flex-wrap gap-x-9 gap-y-2 text-[12.5px] tracking-[0.08em] text-ink-soft tabular-nums"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <span><b className="font-semibold text-ink">{CAPABILITIES.length}</b> CAPABILITIES</span>
            <span><b className="font-semibold text-ink">{totalFeatures}</b> FEATURES</span>
            <span><b className="font-semibold text-ink">5</b> PROGRAMS</span>
            <span><b className="font-semibold text-ink">1</b> PLATFORM</span>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <section key={cap.name} className="panel min-w-0 p-5 pb-3.5">
              <h2 className="text-[17px] font-bold tracking-tight text-ink">
                {cap.name}
              </h2>
              <p className="mb-3 mt-1 text-[12.5px] text-ink-faint">
                {cap.blurb}
              </p>
              <ul>
                {cap.features.map((feature) => (
                  <li
                    key={feature.name}
                    className="flex items-baseline gap-2.5 border-t border-rule-soft py-2 text-[13.5px]"
                  >
                    <span className="min-w-0">{feature.name}</span>
                    <span
                      className="ml-auto whitespace-nowrap text-[11px] text-ink-faint"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {feature.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer
          className="mt-14 flex flex-wrap gap-x-8 gap-y-2 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <span>bccacademy.io/platform-features</span>
          <a href="/platform-map" className="hover:text-ink-soft">↳ The platform map</a>
          <a href="/platform-brief" className="hover:text-ink-soft">↳ The strategy brief</a>
        </footer>
      </div>
    </div>
  );
}
