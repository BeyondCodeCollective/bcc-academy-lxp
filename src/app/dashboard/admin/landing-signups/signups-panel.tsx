import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/ui";
import { DownloadCsvButton } from "@/components/download-csv-button";
import { CopyLinkButton } from "./copy-link-button";

// Signups, one course at a time, from EVERY way someone registers: a landing
// page form (landing_signups), a staff invite (invites), an Eventbrite order
// (eventbrite_orders), or a plain allowlist add (allowed_signup_emails). One
// row per person per course; the row keeps its earliest, most specific source.
// Stage: Enrolled (on the roster) > Signed in (has an account or used their
// link) > Waiting. Shared by the standalone Signups page and the course
// Students dropdown.

export type Source = "landing" | "eventbrite" | "invite" | "allowlist";
type Stage = "enrolled" | "signed-in" | "waiting";

export type Reg = {
  email: string;
  name: string | null;
  track: string;
  source: Source;
  landingSlug: string | null;
  inviteToken: string | null;
  /** Only landing signups carry attribution; every other source is null. */
  heardAbout: string | null;
  /** Session ids picked on a multi-date landing page (Catalyst Labs). */
  sessions?: string[];
  at: string;
};

const SOURCE_RANK: Record<Source, number> = { landing: 0, eventbrite: 1, invite: 2, allowlist: 3 };
export const SOURCE_LABEL: Record<Source, string> = {
  landing: "Landing page",
  eventbrite: "Eventbrite",
  invite: "Invited",
  allowlist: "Allowlisted",
};

type StudentRow = { id: string; email: string; first_name: string | null; last_name: string | null; is_staff: boolean; is_test: boolean };
export type PageRow = {
  slug: string;
  track_slug: string | null;
  published: boolean;
  sessions: { id: string; label: string }[] | null;
};

export type SignupsData = {
  allRegs: Reg[];
  usedToken: Set<string>;
  pageRows: PageRow[];
};

/** Load and merge every registration source. Pass `course` to load one course only. */
export async function loadSignups(allowedTracks: Set<string> | null, course?: string): Promise<SignupsData> {
  const svc = createServiceClient();
  let landingQ = svc
    .from("landing_signups")
    .select("slug, track_slug, email, name, invite_token, heard_about, session_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  let invitesQ = svc
    .from("invites")
    .select("token, email, track_slug, created_at, used_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  let eventbriteQ = svc.from("eventbrite_orders").select("email, track_slug, invite_token, created_at").limit(5000);
  let allowlistQ = svc.from("allowed_signup_emails").select("email, track_slug, added_at").limit(5000);
  let pagesQ = svc.from("landing_pages").select("slug, track_slug, published, sessions");
  if (course) {
    landingQ = landingQ.eq("track_slug", course);
    invitesQ = invitesQ.eq("track_slug", course);
    eventbriteQ = eventbriteQ.eq("track_slug", course);
    allowlistQ = allowlistQ.eq("track_slug", course);
    pagesQ = pagesQ.eq("track_slug", course);
  }
  const [{ data: landing }, { data: invites }, { data: eventbrite }, { data: allowlist }, { data: pages }] =
    await Promise.all([landingQ, invitesQ, eventbriteQ, allowlistQ, pagesQ]);

  // Merge every source into one registration per (course, email), keeping the
  // earliest date and the most specific source.
  const regs = new Map<string, Reg>();
  const usedToken = new Set<string>();
  const add = (r: Reg) => {
    if (!r.track || !r.email) return;
    if (allowedTracks && !allowedTracks.has(r.track)) return;
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
      sessions: [...new Set([...(win.sessions ?? []), ...(lose.sessions ?? [])])],
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
    session_id: string | null;
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
      sessions: r.session_id ? [r.session_id] : [],
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

  const pageRows = ((pages ?? []) as PageRow[]).filter(
    (p) => !allowedTracks || (p.track_slug !== null && allowedTracks.has(p.track_slug)),
  );
  return { allRegs: [...regs.values()], usedToken, pageRows };
}

/** Everything the panel shows for one course (and optional session filter). */
export async function computeCourseSignups(data: SignupsData, course: string, sessionParam: string | undefined) {
  const svc = createServiceClient();
  const courseRows = data.allRegs.filter((r) => r.track === course).sort((a, b) => (a.at < b.at ? 1 : -1));
  const coursePages = data.pageRows.filter((p) => p.track_slug === course);
  // Multi-date pages (Catalyst Labs) have each person pick a session. Without
  // this, October and November signups were indistinguishable.
  const sessionOptions = coursePages.flatMap((p) => p.sessions ?? []);
  const sessionLabel = (id: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(id)
      ? new Date(`${id}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      : (sessionOptions.find((o) => o.id === id)?.label ?? id).split("|")[0].trim();
  const session = sessionParam && sessionOptions.some((o) => o.id === sessionParam) ? sessionParam : null;
  const rows = session ? courseRows.filter((r) => r.sessions?.includes(session)) : courseRows;

  const emails = [...new Set(rows.map((r) => r.email))];
  const [{ data: students }, { data: enrollments }] = await Promise.all([
    emails.length
      ? svc.from("students").select("id, email, first_name, last_name, is_staff, is_test").in("email", emails)
      : Promise.resolve({ data: [] as StudentRow[] }),
    svc.from("student_tracks").select("student_id").eq("track_slug", course),
  ]);
  const studentByEmail = new Map(((students ?? []) as StudentRow[]).map((s) => [s.email.toLowerCase(), s]));
  const enrolledIds = new Set(((enrollments ?? []) as { student_id: string }[]).map((e) => e.student_id));

  const stageOf = (r: Reg): { stage: Stage; internal: boolean; name: string | null } => {
    const s = studentByEmail.get(r.email);
    const internal = !!(s && (s.is_staff || s.is_test));
    const name = r.name?.trim() || [s?.first_name, s?.last_name].filter(Boolean).join(" ").trim() || null;
    if (s && enrolledIds.has(s.id)) return { stage: "enrolled", internal, name };
    if (s || (r.inviteToken && data.usedToken.has(r.inviteToken))) return { stage: "signed-in", internal, name };
    return { stage: "waiting", internal, name };
  };

  const staged = rows.map((r) => ({ r, ...stageOf(r) }));
  const real = staged.filter((x) => !x.internal);
  const enrolled = real.filter((x) => x.stage === "enrolled").length;
  const signedIn = real.filter((x) => x.stage === "signed-in").length;
  const waiting = real.filter((x) => x.stage === "waiting").length;
  return {
    course,
    courseRows,
    coursePages,
    sessionOptions,
    sessionLabel,
    session,
    staged,
    real,
    enrolled,
    signedIn,
    waiting,
    internalCount: staged.length - real.length,
    pct: real.length ? Math.round((enrolled / real.length) * 100) : 0,
  };
}

export type CourseSignups = Awaited<ReturnType<typeof computeCourseSignups>>;

/** One-line headline numbers: shared by the page header and the embedded panel. */
export function signupsSummary(m: CourseSignups): string {
  return (
    `${m.real.length} signed up · ${m.enrolled} enrolled (${m.pct}%) · ${m.signedIn} signed in, not enrolled` +
    (m.waiting > 0 ? ` · ${m.waiting} waiting` : "")
  );
}

export function SignupsPanel({
  model: m,
  sessionHref,
  rosterHref,
  summary,
}: {
  model: CourseSignups;
  /** Link for a session filter chip (null id = All). */
  sessionHref: (id: string | null) => string;
  /** "Open roster" link; omitted when the panel already sits beside the roster. */
  rosterHref?: string;
  /** Show the headline numbers (the standalone page puts them in its header). */
  summary?: boolean;
}) {
  const { course, courseRows, coursePages, sessionOptions, sessionLabel, session, staged, real, internalCount } = m;
  const bySource = new Map<Source, number>();
  for (const x of real) bySource.set(x.r.source, (bySource.get(x.r.source) ?? 0) + 1);
  const sourceLine = (["landing", "eventbrite", "invite", "allowlist"] as Source[])
    .filter((s) => bySource.get(s))
    .map((s) => `${bySource.get(s)} via ${SOURCE_LABEL[s].toLowerCase()}`)
    .join(" · ");

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const origin = "https://bccacademy.io";
  const STAGE_LABEL: Record<Stage, string> = { enrolled: "Enrolled", "signed-in": "Signed in", waiting: "Waiting" };
  // The export is the people to contact: what the filters show, minus internal tests.
  const csvHeader = ["Name", "Email", ...(sessionOptions.length > 0 ? ["Session"] : []), "Signed up", "Heard about", "Status"];
  const csvRows = real.map(({ r, stage, name }) => [
    name ?? "",
    r.email,
    ...(sessionOptions.length > 0 ? [(r.sessions ?? []).map(sessionLabel).join("; ")] : []),
    fmt(r.at),
    r.heardAbout ?? "",
    STAGE_LABEL[stage],
  ]);
  const csvName = `${course}${session ? `-${session}` : ""}-signups.csv`;

  return (
    <div className="space-y-6">
      {summary && <p className="text-sm text-ink-soft">{signupsSummary(m)}</p>}
      <p className="text-xs text-ink-faint">
        {rosterHref && (
          <>
            <Link href={rosterHref} className="font-medium text-primary hover:underline">
              Open roster
            </Link>
            {real.length > 0 && " · "}
          </>
        )}
        {real.length > 0 && <DownloadCsvButton fileName={csvName} header={csvHeader} rows={csvRows} />}
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

      {sessionOptions.length > 0 && (
        <p className="text-xs text-ink-faint">
          Session:{" "}
          {[{ id: null as string | null, text: "All", n: courseRows.length }, ...sessionOptions.map((o) => ({
            id: o.id as string | null,
            text: sessionLabel(o.id),
            n: courseRows.filter((r) => r.sessions?.includes(o.id)).length,
          }))].map((o, i) => (
            <span key={o.id ?? "all"}>
              {i > 0 && " · "}
              <Link
                href={sessionHref(o.id)}
                className={session === o.id ? "font-semibold text-ink" : "font-medium text-primary hover:underline"}
              >
                {o.text} ({o.n})
              </Link>
            </span>
          ))}
        </p>
      )}

      <DataTable
        columns={
          sessionOptions.length > 0
            ? ["Name", "Email", "Session", "Signed up", "Via", "Heard about", "Status", ""]
            : ["Name", "Email", "Signed up", "Via", "Heard about", "Status", ""]
        }
      >
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
            {sessionOptions.length > 0 && (
              <td className="px-4 py-3 align-top text-xs text-ink-soft whitespace-nowrap">
                {r.sessions?.length ? r.sessions.map(sessionLabel).join(", ") : <span className="text-ink-faint">&mdash;</span>}
              </td>
            )}
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
    </div>
  );
}
