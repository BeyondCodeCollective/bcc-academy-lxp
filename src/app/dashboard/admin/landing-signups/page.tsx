import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { resolveTrackLengths } from "@/lib/programs/scope";
import { humanizeSlug } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui";
import { ManageMenu } from "../manage-menu";
import { CopyLinkButton } from "./copy-link-button";
import { CourseSelect } from "./course-select";

export const dynamic = "force-dynamic";

// Signups, one course at a time, from EVERY way someone registers: a landing
// page form (landing_signups), a staff invite (invites), an Eventbrite order
// (eventbrite_orders), or a plain allowlist add (allowed_signup_emails). The
// picker lists every course that has any of these. One row per person per
// course; the row keeps its earliest, most specific source. Stage: Enrolled
// (on the roster) > Signed in (has an account or used their link) > Waiting.

type Source = "landing" | "eventbrite" | "invite" | "allowlist";
type Stage = "enrolled" | "signed-in" | "waiting";

type Reg = {
  email: string;
  name: string | null;
  track: string;
  source: Source;
  landingSlug: string | null;
  inviteToken: string | null;
  /** Only landing signups carry attribution; every other source is null. */
  heardAbout: string | null;
  at: string;
};

const SOURCE_RANK: Record<Source, number> = { landing: 0, eventbrite: 1, invite: 2, allowlist: 3 };
const SOURCE_LABEL: Record<Source, string> = {
  landing: "Landing page",
  eventbrite: "Eventbrite",
  invite: "Invited",
  allowlist: "Allowlisted",
};

type StudentRow = { id: string; email: string; first_name: string | null; last_name: string | null; is_staff: boolean; is_test: boolean };
type PageRow = { slug: string; track_slug: string | null; published: boolean };

export default async function SignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; page?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const [{ data: landing }, { data: invites }, { data: eventbrite }, { data: allowlist }, { data: pages }] =
    await Promise.all([
      svc
        .from("landing_signups")
        .select("slug, track_slug, email, name, invite_token, heard_about, created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      svc
        .from("invites")
        .select("token, email, track_slug, created_at, used_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      svc.from("eventbrite_orders").select("email, track_slug, invite_token, created_at").limit(5000),
      svc.from("allowed_signup_emails").select("email, track_slug, added_at").limit(5000),
      svc.from("landing_pages").select("slug, track_slug, published"),
    ]);

  // Merge every source into one registration per (course, email), keeping the
  // earliest date and the most specific source.
  const regs = new Map<string, Reg>();
  const usedToken = new Set<string>();
  const add = (r: Reg) => {
    if (!r.track || !r.email) return;
    const key = `${r.track} ${r.email}`;
    const prev = regs.get(key);
    if (!prev) {
      regs.set(key, r);
      return;
    }
    const better =
      SOURCE_RANK[r.source] < SOURCE_RANK[prev.source] ||
      (SOURCE_RANK[r.source] === SOURCE_RANK[prev.source] && r.at < prev.at);
    const win = better ? r : prev;
    const lose = better ? prev : r;
    regs.set(key, {
      ...win,
      name: win.name || lose.name,
      inviteToken: win.inviteToken || lose.inviteToken,
      heardAbout: win.heardAbout || lose.heardAbout,
      at: r.at < prev.at ? r.at : prev.at,
    });
  };
  for (const r of (landing ?? []) as {
    slug: string;
    track_slug: string;
    email: string;
    name: string | null;
    invite_token: string | null;
    heard_about: string | null;
    created_at: string;
  }[]) {
    add({
      email: r.email.toLowerCase(),
      name: r.name,
      track: r.track_slug,
      source: "landing",
      landingSlug: r.slug,
      inviteToken: r.invite_token,
      heardAbout: r.heard_about,
      at: r.created_at,
    });
  }
  for (const r of (eventbrite ?? []) as { email: string; track_slug: string; invite_token: string | null; created_at: string }[]) {
    add({
      email: r.email.toLowerCase(),
      name: null,
      track: r.track_slug,
      source: "eventbrite",
      landingSlug: null,
      heardAbout: null,
      inviteToken: r.invite_token,
      at: r.created_at,
    });
  }
  for (const r of (invites ?? []) as { token: string; email: string; track_slug: string; created_at: string; used_at: string | null }[]) {
    if (r.used_at) usedToken.add(r.token);
    add({
      email: r.email.toLowerCase(),
      name: null,
      track: r.track_slug,
      source: "invite",
      landingSlug: null,
      heardAbout: null,
      inviteToken: r.token,
      at: r.created_at,
    });
  }
  for (const r of (allowlist ?? []) as { email: string; track_slug: string; added_at: string }[]) {
    add({
      email: r.email.toLowerCase(),
      name: null,
      track: r.track_slug,
      source: "allowlist",
      landingSlug: null,
      heardAbout: null,
      inviteToken: null,
      at: r.added_at,
    });
  }
  const allRegs = [...regs.values()];

  // Courses with any registration, newest activity first. Only courses the
  // platform can name; stray slugs from old tests don't get a chip.
  const names = await resolveTrackLengths([...new Set(allRegs.map((r) => r.track))]);
  const latestBy = new Map<string, string>();
  for (const r of allRegs) {
    if (!names.has(r.track)) continue;
    const prev = latestBy.get(r.track);
    if (!prev || r.at > prev) latestBy.set(r.track, r.at);
  }
  const courses = [...latestBy.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([slug]) => slug);
  const countBy = new Map<string, number>();
  for (const r of allRegs) countBy.set(r.track, (countBy.get(r.track) ?? 0) + 1);

  const sp = await searchParams;
  // Old ?page=<landing slug> links resolve to that page's course.
  const pageRows = (pages ?? []) as PageRow[];
  const fromPage = sp.page ? (pageRows.find((p) => p.slug === sp.page)?.track_slug ?? null) : null;
  const requested = sp.course ?? fromPage ?? null;
  // No default: the page opens on the picker alone; nothing shows until a course is chosen.
  const course = requested && courses.includes(requested) ? requested : null;
  const rows = course ? allRegs.filter((r) => r.track === course).sort((a, b) => (a.at < b.at ? 1 : -1)) : [];
  const courseName = course ? (names.get(course)?.name ?? humanizeSlug(course)) : null;
  const coursePages = course ? pageRows.filter((p) => p.track_slug === course) : [];

  const emails = [...new Set(rows.map((r) => r.email))];
  const [{ data: students }, { data: enrollments }] = await Promise.all([
    emails.length
      ? svc.from("students").select("id, email, first_name, last_name, is_staff, is_test").in("email", emails)
      : Promise.resolve({ data: [] as StudentRow[] }),
    course
      ? svc.from("student_tracks").select("student_id").eq("track_slug", course)
      : Promise.resolve({ data: [] as { student_id: string }[] }),
  ]);
  const studentByEmail = new Map(((students ?? []) as StudentRow[]).map((s) => [s.email.toLowerCase(), s]));
  const enrolledIds = new Set(((enrollments ?? []) as { student_id: string }[]).map((e) => e.student_id));

  const stageOf = (r: Reg): { stage: Stage; internal: boolean; name: string | null } => {
    const s = studentByEmail.get(r.email);
    const internal = !!(s && (s.is_staff || s.is_test));
    const name = r.name?.trim() || [s?.first_name, s?.last_name].filter(Boolean).join(" ").trim() || null;
    if (s && enrolledIds.has(s.id)) return { stage: "enrolled", internal, name };
    if (s || (r.inviteToken && usedToken.has(r.inviteToken))) return { stage: "signed-in", internal, name };
    return { stage: "waiting", internal, name };
  };

  const staged = rows.map((r) => ({ r, ...stageOf(r) }));
  const real = staged.filter((x) => !x.internal);
  const enrolled = real.filter((x) => x.stage === "enrolled").length;
  const signedIn = real.filter((x) => x.stage === "signed-in").length;
  const waiting = real.filter((x) => x.stage === "waiting").length;
  const internalCount = staged.length - real.length;
  const pct = real.length ? Math.round((enrolled / real.length) * 100) : 0;
  const bySource = new Map<Source, number>();
  for (const x of real) bySource.set(x.r.source, (bySource.get(x.r.source) ?? 0) + 1);
  const sourceLine = (["landing", "eventbrite", "invite", "allowlist"] as Source[])
    .filter((s) => bySource.get(s))
    .map((s) => `${bySource.get(s)} via ${SOURCE_LABEL[s].toLowerCase()}`)
    .join(" · ");

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const origin = "https://bccacademy.io";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={courseName ? `${courseName} signups` : "Signups"}
        subtitle={
          course
            ? `${real.length} signed up · ${enrolled} enrolled (${pct}%) · ${signedIn} signed in, not enrolled` +
              (waiting > 0 ? ` · ${waiting} waiting` : "")
            : courses.length
              ? "Choose a course to see who signed up."
              : "No signups yet."
        }
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />

      {/* Course picker: one course at a time. */}
      {courses.length > 0 && (
        <CourseSelect
          value={course ?? ""}
          courses={courses.map((slug) => ({
            slug,
            name: names.get(slug)?.name ?? humanizeSlug(slug),
            count: countBy.get(slug) ?? 0,
          }))}
        />
      )}

      {course && (
        <>
          <p className="text-xs text-ink-faint">
            <Link
              href={`/dashboard/admin?tab=${encodeURIComponent(course)}&view=students`}
              className="font-medium text-primary hover:underline"
            >
              Open roster
            </Link>
            {coursePages.map((p) => (
              <span key={p.slug}>
                {" · "}
                <a
                  href={`/bcc/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-ink-soft hover:underline"
                >
                  /bcc/{p.slug}
                </a>
                {!p.published && (
                  <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-micro font-semibold text-neutral-600">
                    unpublished
                  </span>
                )}
              </span>
            ))}
            {sourceLine && ` · ${sourceLine}`}
            {internalCount > 0 && ` · ${internalCount} internal test${internalCount === 1 ? "" : "s"} shown but not counted`}
          </p>

          <DataTable columns={["Name", "Email", "Signed up", "Via", "Heard about", "Status", ""]}>
            {staged.map(({ r, stage, internal, name }) => (
              <tr key={r.email} className={internal ? "text-ink-faint" : "text-ink"}>
                <td className="px-4 py-3 align-top font-medium">
                  {name || <span className="text-ink-faint">&mdash;</span>}
                  {internal && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-micro font-semibold text-neutral-600">
                      internal
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm">{r.email}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-soft whitespace-nowrap">{fmt(r.at)}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-soft whitespace-nowrap">
                  {r.source === "landing" && r.landingSlug ? `/bcc/${r.landingSlug}` : SOURCE_LABEL[r.source]}
                </td>
                <td className="px-4 py-3 align-top text-xs text-ink-soft">
                  {r.heardAbout || <span className="text-ink-faint">&mdash;</span>}
                </td>
                <td className="px-4 py-3 align-top">
                  {stage === "enrolled" ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-micro font-semibold text-green-800">
                      Enrolled
                    </span>
                  ) : stage === "signed-in" ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-micro font-semibold text-blue-800">
                      Signed in
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-micro font-semibold text-amber-800">
                      Waiting
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  {stage !== "enrolled" && r.inviteToken && (
                    <CopyLinkButton url={`${origin}/invite/${r.inviteToken}`} title="Copy their one-click link" />
                  )}
                </td>
              </tr>
            ))}
          </DataTable>

          <p className="text-xs leading-relaxed text-ink-faint">
            One row per person, from every way they can register: a landing page form, a staff invite, an
            Eventbrite order, or an allowlist add. &ldquo;Waiting&rdquo; = no account yet (copy their link to
            nudge them). &ldquo;Signed in&rdquo; = has an account but isn&apos;t on this roster.
            &ldquo;Enrolled&rdquo; = on the roster.
          </p>
        </>
      )}
    </div>
  );
}
