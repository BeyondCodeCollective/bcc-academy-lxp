import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Map — BCC Academy",
  robots: { index: false, follow: false },
};

// Internal presentation page: the whole platform as a clickable map — every
// row opens the live page. Built for walking leadership through everything
// that exists. Admin-only: it enumerates admin tooling, so it's a signed-in
// staff surface, not a public sitemap. Standalone route (outside /dashboard)
// so it renders full-bleed without the app shell — it's a stage, not a screen.

type PageRow = {
  name: string;
  route: string;
  /** Live link; null when the route needs a per-record id we can't pick for you. */
  href: string | null;
};
type Zone = { name: string; blurb: string; pages: PageRow[] };

const ZONES: Zone[] = [
  {
    name: "Marketing site",
    blurb: "No login. Where students and funders meet us.",
    pages: [
      { name: "Homepage", route: "/", href: "/" },
      { name: "Campaign landing pages", route: "/bcc/[slug]", href: "/bcc/bgc-roblox" },
      { name: "Career quiz", route: "/quiz", href: "/quiz" },
      { name: "Career pathways — cert ladders & salaries", route: "/pathways/[slug]", href: "/pathways/cybersecurity" },
      // Age-stage pages render only in the logged-out marketing context
      // (a signed-in admin's program cookie 404s them) — no live link.
      { name: "Age-stage pathways", route: "/pathways/[slug]", href: null },
      { name: "Public surveys", route: "/survey/[id]", href: "/survey/bcc-learner-intake" },
      { name: "Help center", route: "/help", href: "/help" },
    ],
  },
  {
    name: "Getting in",
    blurb: "Every door is passwordless.",
    pages: [
      { name: "Security+ application", route: "/apply/security-plus", href: "/apply/security-plus" },
      { name: "Home for the Summer application — resume upload", route: "/apply/home-for-summer", href: "/apply/home-for-summer" },
      { name: "Embedded Eventbrite checkout", route: "/bcc/game-on", href: "/bcc/game-on" },
      { name: "Program join links", route: "/join/[slug]", href: "/join/bgc" },
      { name: "Magic-link login", route: "/login", href: "/login" },
      { name: "One-click invite login", route: "/invite/<token>", href: null },
      { name: "Auto-provisioning callback", route: "/auth/callback", href: null },
    ],
  },
  {
    name: "Learner portal",
    blurb: "One chassis, five brands — Catalyst, BGC, Upskill Bahamas, Beyond the Game, Beyond Code Centers each get their own shell.",
    pages: [
      { name: "Learner home", route: "/dashboard", href: "/dashboard" },
      { name: "Course overview + holding page", route: "/track/[slug]", href: "/dashboard/track/roblox-virtual-bootcamp" },
      { name: "Classroom — video, Zoom, work", route: "/track/[slug]/[week]", href: "/dashboard/track/roblox-virtual-bootcamp/1" },
      // Tutor is per-program opt-in (Upskill Bahamas only) — 404s elsewhere.
      { name: "AI Tutor — Upskill Bahamas only", route: "/tutor", href: null },
      { name: "Course catalog", route: "/courses", href: "/dashboard/courses" },
      { name: "Pathway assessment + results", route: "/assessment", href: "/dashboard/assessment" },
      { name: "In-portal surveys", route: "/survey/[id]", href: "/dashboard/survey/comptia-security-pre" },
      { name: "My analytics", route: "/insights", href: "/dashboard/insights" },
      { name: "Onboarding · guide · help", route: "/start · /guide", href: "/dashboard/start" },
      { name: "Resources · Settings", route: "/resources", href: "/dashboard/resources" },
    ],
  },
  {
    name: "Staff surfaces",
    blurb: "For the people who run programs but don't administer the platform.",
    pages: [
      // BGC-internal — these 404 outside the BGC program context.
      { name: "Lunch & Learn hub + player", route: "/lunch-learn", href: null },
      { name: "Lunch & Learn manager", route: "/lunch-learn/admin", href: null },
      { name: "Workshops hub + detail — BGC only", route: "/workshops", href: null },
      { name: "Instructor-scoped admin (their courses only)", route: "role-scoped /admin", href: null },
      { name: "Preview-as-student mode", route: "super-admin toggle", href: null },
    ],
  },
  {
    name: "Admin engine",
    blurb: "Staff run every program from here — no engineers.",
    pages: [
      { name: "Admin home — courses, people, attendance", route: "/admin", href: "/dashboard/admin" },
      { name: "Survey Insights + CSV/PDF", route: "/admin/insights", href: "/dashboard/admin/insights" },
      { name: "Engagement funnel", route: "?tab=analytics", href: "/dashboard/admin?tab=analytics" },
      { name: "Eventbrite registrations", route: "/admin/registrations", href: "/dashboard/admin/registrations" },
      { name: "Bulk one-click invites", route: "/admin/invites", href: "/dashboard/admin/invites" },
      { name: "Manage Courses — live edits", route: "/admin/programs", href: "/dashboard/admin/programs" },
      { name: "Organizations — create an org, no deploy", route: "/admin/organizations", href: "/dashboard/admin/organizations" },
      { name: "Staff & cross-program access grants", route: "/admin/staff", href: "/dashboard/admin/staff" },
      { name: "Landing-page builder", route: "/admin/landing", href: "/dashboard/admin/landing" },
      { name: "Certificates — issue & email", route: "Students → Certificates", href: "/dashboard/admin" },
      { name: "Allowlist", route: "/admin/allowlist", href: "/dashboard/admin/allowlist" },
      { name: "Survey manager + viewer", route: "/admin/surveys", href: "/dashboard/admin/surveys" },
      { name: "Assessment results", route: "/admin/assessments", href: "/dashboard/admin/assessments" },
      { name: "Feature toggles · Resources", route: "/admin/features", href: "/dashboard/admin/features" },
    ],
  },
  {
    name: "Compliance & credentials",
    blurb: "Small in page count, disproportionate in what it protects and proves.",
    pages: [
      { name: "Public certificates — verifiable, no login", route: "/certificate/[id]", href: null },
      { name: "Participation agreement signing", route: "/dashboard/agreement", href: "/dashboard/agreement" },
      { name: "Agreements admin — who signed, by cohort", route: "/admin/agreements", href: "/dashboard/admin/agreements" },
      { name: "Privacy + self-serve data deletion", route: "/privacy/withdraw", href: "/privacy" },
      { name: "Terms", route: "/terms", href: "/terms" },
      { name: "COPPA gating (BGC camps)", route: "program config", href: null },
      { name: "Admin PII access audit log", route: "admin_access_log", href: null },
    ],
  },
  {
    name: "Platform services",
    blurb: "The machinery you can't see — it's why the pages you can see are trustworthy.",
    pages: [
      { name: "Eventbrite funnel — webhook + instant account claim", route: "/api/eventbrite/*", href: null },
      { name: "Zoom session security — signed SDK joins, no exposed links", route: "/api/zoom-signature · /zoom-frame", href: null },
      { name: "Email engine — invites, reminders, certificates (Resend)", route: "lib/email", href: null },
      { name: "Cron jobs — daily snapshots, Zoom attendance + recording import", route: "/api/cron/*", href: null },
      { name: "CSP enforcement + violation report sink", route: "/api/csp-report", href: null },
      { name: "AI Tutor backend", route: "/api/tutor", href: null },
      { name: "Calendar generation (Google + iCal)", route: "/api/calendar/event", href: null },
      { name: "Insights exports — CSV + PDF", route: "/api/insights/*", href: null },
    ],
  },
];

const totalPages = 59;

export default async function PlatformMapPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-7 pb-24 pt-16">
        <header>
          <p
            className="text-xs uppercase tracking-[0.18em] text-primary"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            BCC Academy · The Platform Map
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            One platform.
            <br />
            Fifty-nine pages.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Everything live in production today, built October to August. Every row is a
            door — click it to open the real page.
          </p>
          <div
            className="mb-11 mt-6 flex flex-wrap gap-x-9 gap-y-2 text-[12.5px] tracking-[0.08em] text-ink-soft tabular-nums"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <span><b className="font-semibold text-ink">{totalPages}</b> PAGES</span>
            <span><b className="font-semibold text-ink">5</b> PROGRAMS</span>
            <span><b className="font-semibold text-ink">7</b> AREAS</span>
            <span><b className="font-semibold text-ink">1</b> PLATFORM</span>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ZONES.map((zone) => (
            <section key={zone.name} className="panel min-w-0 p-5 pb-3.5">
              <h2 className="flex items-baseline justify-between gap-2 text-[17px] font-bold tracking-tight text-ink">
                {zone.name}
                <span
                  className="text-[11px] font-normal text-ink-faint tabular-nums"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {zone.pages.length} {zone.name === "Platform services" ? "services" : "pages"}
                </span>
              </h2>
              <p className="mb-3 mt-1 text-[12.5px] text-ink-faint">
                {zone.blurb}
              </p>
              <ul>
                {zone.pages.map((page) => {
                  const inner = (
                    <>
                      <span className="min-w-0">{page.name}</span>
                      <span
                        className="ml-auto max-w-[46%] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-ink-faint"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {page.route}
                        {page.href && <span className="opacity-60"> ↗</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={page.name} className="border-t border-rule-soft">
                      {page.href ? (
                        <a
                          href={page.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="-mx-1.5 flex items-baseline gap-2.5 rounded-lg px-1.5 py-2 text-[13.5px] transition-colors hover:bg-paper-tint-soft"
                        >
                          {inner}
                        </a>
                      ) : (
                        <span className="-mx-1.5 flex items-baseline gap-2.5 px-1.5 py-2 text-[13.5px]">
                          {inner}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer
          className="mt-14 flex flex-wrap gap-x-8 gap-y-2 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <span>bccacademy.io · links open the live product in a new tab</span>
          <a href="/platform-features" className="hover:text-ink-soft">↳ The feature set</a>
          <a href="/platform-brief" className="hover:text-ink-soft">↳ The strategy brief</a>
        </footer>
      </div>
    </div>
  );
}
