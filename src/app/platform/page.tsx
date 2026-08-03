import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Directory — BCC Academy",
  robots: { index: false, follow: false },
};

// Internal directory: the one URL to remember. Groups every staff-relevant
// link — presentation pages, admin entry points, public front doors. Staff-only,
// standalone pattern shared with the presentation pages.

type DirLink = { name: string; href: string; blurb?: string };
type Group = { name: string; links: DirLink[] };

const GROUPS: Group[] = [
  {
    name: "The pitch",
    links: [
      { name: "The feature set", href: "/platform-features", blurb: "Everything the platform does, by capability" },
      { name: "The platform map", href: "/platform-map", blurb: "Every page in production — rows open the live product" },
      { name: "The strategy brief", href: "/platform-brief", blurb: "Why we own the platform; Zoom today, YouTube on the shelf" },
    ],
  },
  {
    name: "Run the platform",
    links: [
      { name: "Admin home", href: "/dashboard/admin", blurb: "Courses, people, attendance" },
      { name: "Survey Insights", href: "/dashboard/admin/insights", blurb: "Outcomes, cohort filters, CSV/PDF" },
      { name: "Organizations", href: "/dashboard/admin/organizations", blurb: "Create an org — no deploy" },
      { name: "Staff & access", href: "/dashboard/admin/staff", blurb: "Roles and cross-program grants" },
      { name: "Add people", href: "/dashboard/admin/invites", blurb: "Invites and allowlists" },
      { name: "Manage Courses", href: "/dashboard/admin/programs", blurb: "Live course edits" },
    ],
  },
  {
    name: "Front doors",
    links: [
      { name: "Homepage", href: "/", blurb: "The public face" },
      { name: "Learner portal", href: "/dashboard", blurb: "What students see" },
      { name: "Career quiz", href: "/quiz", blurb: "Public entry point" },
      { name: "Help center", href: "/help", blurb: "Learner support" },
    ],
  },
];

export default async function PlatformDirectoryPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-5xl px-7 pb-24 pt-16">
        <header>
          <p
            className="text-xs uppercase tracking-[0.18em] text-primary"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            BCC Academy · Directory
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            One URL.
            <br />
            Every door.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The pitch pages, the admin engine, and the public front doors —
            bookmark this one.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.name} className="panel min-w-0 p-5 pb-3.5">
              <h2 className="text-lg font-bold tracking-tight text-ink">
                {group.name}
              </h2>
              <ul className="mt-2">
                {group.links.map((link) => (
                  <li key={link.href} className="border-t border-rule-soft">
                    <a
                      href={link.href}
                      className="group -mx-1.5 flex items-baseline gap-2.5 rounded-lg px-1.5 py-2 text-sm transition-colors hover:bg-paper-tint-soft"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold text-ink">{link.name}</span>
                        {link.blurb && (
                          <span className="block text-xs text-ink-faint">
                            {link.blurb}
                          </span>
                        )}
                      </span>
                      <span
                        className="ml-auto max-w-[42%] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink-faint group-hover:text-primary"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {link.href} ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer
          className="mt-14 text-xs uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <span>bccacademy.io/platform · internal — staff only</span>
        </footer>
      </div>
    </div>
  );
}
