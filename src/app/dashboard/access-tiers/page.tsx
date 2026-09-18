import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { canAccessAdminPanel, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";

// The access model, written down where staff can read it. Deliberately NOT a
// public page: it names the email tiers and the places the model is thin, which
// is a map of the platform's privilege surface. Staff-gated, and the section
// naming individual people is master-only.
export const dynamic = "force-dynamic";

type Level = "full" | "scoped" | "none";

const TIERS: {
  rank: string;
  rankLabel: string;
  name: string;
  slug: string;
  blurb: string;
  scope: string;
  master?: boolean;
}[] = [
  {
    rank: "0",
    rankLabel: "Rank",
    name: "Student",
    slug: "student",
    blurb:
      "The learner dashboard: their courses, the calendar, session pages, submissions, reflections, the tutor. No admin surface at all.",
    scope: "Their own enrollments",
  },
  {
    rank: "1",
    rankLabel: "Rank",
    name: "Instructor",
    slug: "instructor",
    blurb:
      "Sees the admin panel, but only for the courses they are assigned to. Works the instructor queue — resolving flags the AI raised and passing checkpoints only a person may pass. Reaches announcements and resources. Touches no roster.",
    scope: "Their assigned courses",
  },
  {
    rank: "2",
    rankLabel: "Rank",
    name: "Admin",
    slug: "admin",
    blurb:
      "Runs a program. Creates courses from a brief, edits and hides them, manages people and cohorts, sends invites, posts announcements, reads survey insights, participation agreements and participant locations. This is the tier the programs team needs.",
    scope: "Their own program",
  },
  {
    rank: "3",
    rankLabel: "Rank",
    name: "Super admin",
    slug: "super_admin",
    blurb:
      "Everything an admin does, across every program, plus the program switcher. Also holds the marketing and platform surfaces: landing pages, the photo library, signups, applications, registrations, exams and tools.",
    scope: "All programs",
  },
  {
    rank: "★",
    rankLabel: "Above",
    name: "Master",
    slug: "isMasterEmail()",
    blurb:
      "Not a database role — an email allowlist, so it can never be granted by editing the students table and no super-admin can hand it out. It is the only tier that can change another person's role or create a super-admin, and it owns program access grants, organizations, platform analytics and platform health.",
    scope: "Everything, plus role management",
    master: true,
  },
];

const MATRIX: { surface: string; levels: [Level, Level, Level, Level, Level] }[] = [
  { surface: "Learner dashboard & courses", levels: ["full", "full", "full", "full", "full"] },
  { surface: "See the admin panel", levels: ["none", "scoped", "scoped", "full", "full"] },
  { surface: "Instructor queue", levels: ["none", "scoped", "scoped", "full", "full"] },
  { surface: "Announcements & resources", levels: ["none", "scoped", "scoped", "full", "full"] },
  { surface: "Create, edit & hide courses", levels: ["none", "none", "scoped", "full", "full"] },
  { surface: "People, cohorts & invites", levels: ["none", "none", "scoped", "full", "full"] },
  { surface: "Survey insights, agreements, locations", levels: ["none", "none", "scoped", "full", "full"] },
  { surface: "Program switcher", levels: ["none", "none", "none", "full", "full"] },
  { surface: "Landing pages, photo library, signups", levels: ["none", "none", "none", "full", "full"] },
  { surface: "Applications, registrations, exams, tools", levels: ["none", "none", "none", "full", "full"] },
  { surface: "Change someone's role", levels: ["none", "none", "scoped", "scoped", "full"] },
  { surface: "Grant super admin", levels: ["none", "none", "none", "none", "full"] },
  { surface: "Program access grants, organizations", levels: ["none", "none", "none", "none", "full"] },
  { surface: "Platform analytics & health", levels: ["none", "none", "none", "none", "full"] },
];

const FINDINGS: { kind: string; title: string; body: React.ReactNode }[] = [
  {
    kind: "Capability naming",
    title: '"Can switch programs" is standing in for "is a super admin"',
    body: (
      <>
        Nine surfaces — landing pages, the photo library, signups, applications, registrations,
        exams, tools, staff and part of Manage Courses — ask <Code>canSwitchPrograms()</Code> to
        decide whether to let you in. That capability means one thing: may you use the program
        switcher. Using it as a synonym for seniority means you cannot give somebody the landing
        page editor without also handing them every program on the platform. The permission you want
        to grant and the permission you actually grant have drifted apart.
      </>
    ),
  },
  {
    kind: "Source of truth",
    title: "Privilege has two sources of truth",
    body: (
      <>
        A person&apos;s role lives in <Code>students.role</Code>, but environment lists also decide
        privilege — and <Code>ADMIN_EMAILS</Code> and <Code>SUPER_ADMIN_EMAILS</Code> are both set as
        secrets in production right now. Any address on those lists becomes an admin or a super-admin
        the first time it signs in, and nothing in the People tab shows that the list exists.{" "}
        <Code>determineRole()</Code> only runs at account creation, so afterwards the database wins
        and the lists quietly go stale. Nothing is broken today; it makes &ldquo;what is this person,
        and why?&rdquo; a two-place question.
      </>
    ),
  },
  {
    kind: "Visibility",
    title: "Master is invisible in the product",
    body: (
      <>
        The tier with the most power is the only one a person cannot see they hold. A master is{" "}
        <Code>super_admin</Code> in the database and master by email address, but nothing anywhere
        shows the second half — no badge, no line in the account menu, no marker in People.
      </>
    ),
  },
  {
    kind: "Product gap",
    title: "An admin can create a course but not publish its landing page",
    body: (
      <>
        Course creation from a brief produces the course, the sessions, the application and the
        landing page in one pass — and the landing page arrives unpublished. Publishing lives behind
        the landing editor, which is super-admin only. So the programs team builds the whole thing
        and then waits on someone else to make the public page live.
      </>
    ),
  },
];

const RECOMMENDATIONS: { lead: string; body: React.ReactNode }[] = [
  {
    lead: "Name the capabilities that canSwitchPrograms is currently covering.",
    body: (
      <>
        Add <Code>manage_marketing</Code> (landing pages, photo library, signups),{" "}
        <Code>manage_applications</Code> and <Code>manage_platform</Code>, and gate those nine
        surfaces on them. Mechanical change, no behavior shift on day one — but afterwards you can
        give someone the landing editor without giving them every program.
      </>
    ),
  },
  {
    lead: "Decide whether a program admin may publish their own landing page.",
    body: (
      <>
        A product call, not a cleanup. If yes, it is the first real use of{" "}
        <Code>manage_marketing</Code> scoped to a program. If no, the course-creation flow should say
        so at the end, so the team knows a hand-off is coming rather than discovering a dead link.
      </>
    ),
  },
  {
    lead: "Show the master tier in the product.",
    body: (
      <>
        A small marker in the account menu and beside the name in People. &ldquo;Who am I here&rdquo;
        should never require reading the source.
      </>
    ),
  },
  {
    lead: "Retire ADMIN_EMAILS.",
    body: (
      <>
        It is set in production today, and it grants admin to anyone on it at first sign-in with no
        trace in the People tab. Now that admins can be promoted from People, it is a second door to
        the same room. Keep the master list and the super-admin baseline — those exist precisely so
        they cannot be granted from inside the app.
      </>
    ),
  },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-paper-tint px-1 py-0.5 font-mono text-[0.9em] text-ink">
      {children}
    </code>
  );
}

function Dot({ level }: { level: Level }) {
  const base = "inline-block h-[11px] w-[11px] rounded-full border-[1.5px] align-middle";
  if (level === "full") return <span className={`${base} border-primary bg-primary`} />;
  if (level === "scoped") return <span className={`${base} border-primary`} />;
  return <span className={`${base} border-rule`} />;
}

export default async function AccessTiersPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const role = ctx.student?.role ?? "";
  // Preview-as-student has to mean it here too, or the restriction is theater.
  if (await isPreviewingAsStudent(role)) redirect("/dashboard");
  if (!canAccessAdminPanel(role)) redirect("/dashboard");

  // Who holds which tier is named by email — that stays with the tier that can
  // actually change it.
  const isMaster = canManageRoles(ctx.userEmail);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-12">
      <PageHeader
        eyebrow="Platform access"
        title="Who can do what on the LXP"
        subtitle="Four roles live in the database and one tier sits above them, gated by email address rather than by a role. This is what each one reaches today, and the four places the model is worth tightening."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">The ladder</h2>
        <p className="max-w-[68ch] text-ink-soft">
          The ladder is <strong className="font-semibold text-ink">cumulative</strong>: every tier
          holds everything below it, plus more. That is deliberate — it used to not be, and a
          super-admin who lacked people management could do less than the admin they outranked.
        </p>

        <ul className="space-y-2.5">
          {TIERS.map((tier) => (
            <li
              key={tier.slug}
              className={`grid grid-cols-[46px_1fr] gap-4 rounded-lg border p-4 sm:grid-cols-[62px_1fr] sm:gap-5 sm:p-5 ${
                tier.master ? "border-primary bg-white" : "border-rule bg-paper-tint-soft"
              }`}
            >
              <div>
                <div className="font-display text-2xl font-bold leading-none text-primary tabular-nums sm:text-3xl">
                  {tier.rank}
                </div>
                <div className="mt-1.5 text-micro font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {tier.rankLabel}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h3 className="text-base font-semibold text-ink">{tier.name}</h3>
                  <span className="font-mono text-xs text-ink-faint">{tier.slug}</span>
                </div>
                <p className="text-sm text-ink-soft">{tier.blurb}</p>
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    tier.master ? "border-primary text-primary" : "border-rule text-ink-soft"
                  }`}
                >
                  {tier.scope}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">What each tier reaches</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <Dot level="full" /> Full access
          </span>
          <span className="inline-flex items-center gap-2">
            <Dot level="scoped" /> Scoped — their program or their courses
          </span>
          <span className="inline-flex items-center gap-2">
            <Dot level="none" /> No access
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full min-w-[660px] border-collapse text-sm">
            <thead>
              <tr className="bg-paper-tint">
                {["Surface", "Student", "Instructor", "Admin", "Super", "Master"].map((h, i) => (
                  <th
                    key={h}
                    className={`border-b border-rule px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft ${
                      i === 0 ? "text-left" : "w-[84px] text-center"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.surface} className="last:[&>td]:border-b-0">
                  <td className="border-b border-rule px-3.5 py-2.5 text-ink-soft">{row.surface}</td>
                  {row.levels.map((level, i) => (
                    <td key={i} className="border-b border-rule px-3.5 py-2.5 text-center">
                      <Dot level={level} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="max-w-[68ch] text-ink-soft">
          Anyone can change a role only{" "}
          <strong className="font-semibold text-ink">below their own tier</strong>, and never someone
          at or above it — so an admin may make a student an instructor, a super-admin may make
          someone an admin, and only a master may mint a super-admin.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Staff is not a rank</h2>
        <p className="max-w-[68ch] text-ink-soft">
          <strong className="font-semibold text-ink">Staff</strong> is a separate flag, not a rung.
          Any <Code>@wearebgc.org</Code> or <Code>@wearebcc.org</Code> address is treated as staff on
          sign-in: it sets their home program (BGC and Catalyst respectively) and opens the internal
          Lunch &amp; Learn content. It grants no admin access whatsoever. A staff member with no
          role is still a student.
        </p>
      </section>

      {isMaster && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Where you sit</h2>
          <div className="rounded-lg border-2 border-primary bg-paper-tint-soft p-5 sm:p-6">
            <dl className="grid gap-x-5 gap-y-1 sm:grid-cols-[max-content_1fr] sm:gap-y-2.5 text-sm">
              <dt className="font-semibold text-ink">In the database</dt>
              <dd className="mb-2 text-ink-soft sm:mb-0">
                <Code>super_admin</Code> — every program, the switcher, every marketing and platform
                surface.
              </dd>

              <dt className="font-semibold text-ink">By email</dt>
              <dd className="mb-2 text-ink-soft sm:mb-0">
                Your address sits in both the super-admin baseline and the master list, so you also
                hold master: role management, program access grants, organizations, platform
                analytics and platform health.
              </dd>

              <dt className="font-semibold text-ink">Who else is up there</dt>
              <dd className="mb-2 text-ink-soft sm:mb-0">
                One other baseline super-admin, plus anyone named by a{" "}
                <Code>SUPER_ADMIN_EMAILS</Code> secret in production. Neither holds master:{" "}
                <Code>MASTER_EMAILS</Code> is not set in production, so only the hardcoded default
                applies.
              </dd>

              <dt className="font-semibold text-ink">Day to day</dt>
              <dd className="text-ink-soft">
                You are the only person who can promote someone to admin or super-admin. A
                super-admin can promote up to admin. Nobody else can change a role at all.
              </dd>
            </dl>
          </div>
        </section>
      )}

      <section className="space-y-5">
        <h2 className="text-xl font-semibold text-ink">Where the model is rough</h2>
        <div className="space-y-6">
          {FINDINGS.map((f) => (
            <article key={f.title} className="space-y-2 border-t border-rule pt-5">
              <p className="text-micro font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {f.kind}
              </p>
              <h3 className="text-base font-semibold text-ink">{f.title}</h3>
              <p className="max-w-[68ch] text-sm text-ink-soft">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">What is working</h2>
        <p className="max-w-[68ch] text-ink-soft">
          Three things are worth keeping exactly as they are. The ladder is{" "}
          <strong className="font-semibold text-ink">cumulative</strong>, so no promotion ever takes
          a power away. Role management is gated by{" "}
          <strong className="font-semibold text-ink">email, not by a database role</strong>, so
          nobody can grant themselves the ability to mint admins by editing a table. And permissions
          are expressed as <strong className="font-semibold text-ink">named capabilities</strong>{" "}
          rather than scattered role-string comparisons, which is why adding a new restricted action
          is a one-line change in one file.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">What I would change</h2>
        <ol className="space-y-4">
          {RECOMMENDATIONS.map((r, i) => (
            <li key={r.lead} className="grid grid-cols-[30px_1fr] gap-3.5">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-primary font-display text-base font-bold text-white tabular-nums">
                {i + 1}
              </span>
              <div className="text-sm text-ink-soft">
                <strong className="block font-semibold text-ink">{r.lead}</strong>
                {r.body}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="space-y-1.5 border-t border-rule pt-5 text-sm text-ink-faint">
        <p>Every statement here was read from the code on main, not from documentation.</p>
        <p>
          Ladder: <Code>src/lib/roles.ts</Code> · email tiers: <Code>src/lib/auth/admins.ts</Code> ·
          per-surface gates: <Code>src/app/dashboard/admin/*/page.tsx</Code>
        </p>
      </footer>
    </div>
  );
}
