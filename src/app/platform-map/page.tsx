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
    name: "Public",
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
      { name: "Public certificates", route: "/certificate/[id]", href: null },
      { name: "Help center", route: "/help", href: "/help" },
      { name: "Privacy + data deletion", route: "/privacy", href: "/privacy" },
      { name: "Terms", route: "/terms", href: "/terms" },
    ],
  },
  {
    name: "Getting in",
    blurb: "Every door is passwordless.",
    pages: [
      { name: "Security+ application", route: "/apply/security-plus", href: "/apply/security-plus" },
      { name: "Program join links", route: "/join/[slug]", href: "/join/bgc" },
      { name: "Magic-link login", route: "/login", href: "/login" },
      { name: "One-click invite login", route: "/invite/<token>", href: null },
      { name: "Auto-provisioning callback", route: "/auth/callback", href: null },
    ],
  },
  {
    name: "Student portal",
    blurb: "Per-program branding; a camper sees only her world.",
    pages: [
      { name: "Learner home", route: "/dashboard", href: "/dashboard" },
      { name: "Course overview + holding page", route: "/track/[slug]", href: "/dashboard/track/roblox-virtual-bootcamp" },
      { name: "Classroom — video, Zoom, work", route: "/track/[slug]/[week]", href: "/dashboard/track/roblox-virtual-bootcamp/1" },
      // Tutor is per-program opt-in (Forte/Upskill Bahamas only) — the route
      // 404s in other program contexts, so no live link from the map.
      { name: "AI Tutor — Upskill Bahamas only", route: "/tutor", href: null },
      { name: "Course catalog", route: "/courses", href: "/dashboard/courses" },
      { name: "Workshops hub + detail", route: "/workshops", href: "/dashboard/workshops" },
      { name: "Lunch & Learn hub + player", route: "/lunch-learn", href: "/dashboard/lunch-learn" },
      { name: "Pathway assessment + results", route: "/assessment", href: "/dashboard/assessment" },
      { name: "Participation agreement", route: "/agreement", href: "/dashboard/agreement" },
      { name: "In-portal surveys", route: "/survey/[id]", href: "/dashboard/survey/comptia-security-pre" },
      { name: "My analytics", route: "/insights", href: "/dashboard/insights" },
      { name: "Onboarding · guide · help", route: "/start · /guide", href: "/dashboard/start" },
      { name: "Resources · Settings", route: "/resources", href: "/dashboard/resources" },
    ],
  },
  {
    name: "Admin engine",
    blurb: "Staff run every program from here — no engineers.",
    pages: [
      { name: "Admin home — courses, people, attendance", route: "/admin", href: "/dashboard/admin" },
      { name: "Survey Insights + CSV", route: "/admin/insights", href: "/dashboard/admin/insights" },
      { name: "Engagement funnel", route: "?tab=analytics", href: "/dashboard/admin?tab=analytics" },
      { name: "Eventbrite registrations", route: "/admin/registrations", href: "/dashboard/admin/registrations" },
      { name: "Bulk one-click invites", route: "/admin/invites", href: "/dashboard/admin/invites" },
      { name: "Manage Courses — live edits", route: "/admin/programs", href: "/dashboard/admin/programs" },
      { name: "Landing-page builder", route: "/admin/landing", href: "/dashboard/admin/landing" },
      { name: "Certificates — issue & email", route: "Students → Certificates", href: "/dashboard/admin" },
      { name: "Allowlist", route: "/admin/allowlist", href: "/dashboard/admin/allowlist" },
      { name: "Survey manager + viewer", route: "/admin/surveys", href: "/dashboard/admin/surveys" },
      { name: "Assessment results", route: "/admin/assessments", href: "/dashboard/admin/assessments" },
      { name: "Participation agreements", route: "/admin/agreements", href: "/dashboard/admin/agreements" },
      { name: "Feature toggles · Resources", route: "/admin/features", href: "/dashboard/admin/features" },
    ],
  },
];

const totalPages = 56;

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
            Fifty-six pages.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Everything live in production today, built October to July. Every row is a
            door — click it to open the real page.
          </p>
          <div
            className="mb-11 mt-6 flex flex-wrap gap-x-9 gap-y-2 text-[12.5px] tracking-[0.08em] text-ink-soft tabular-nums"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <span><b className="font-semibold text-ink">{totalPages}</b> PAGES</span>
            <span><b className="font-semibold text-ink">5</b> PROGRAMS</span>
            <span><b className="font-semibold text-ink">4</b> AREAS</span>
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
                  {zone.pages.length} pages
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
          className="mt-14 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          bccacademy.io · links open the live product in a new tab
        </footer>
      </div>
    </div>
  );
}
