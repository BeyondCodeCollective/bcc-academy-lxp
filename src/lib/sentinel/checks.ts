// The Sentinel's check library. Every check is a rule that was broken in
// production at least once — the same invariants as scripts/audit-data.mjs,
// ported to run inside the app (nightly cron + admin Platform Health page)
// instead of only when someone remembers to run the script.
//
// Read-only: nothing in this file writes.

import type { createServiceClient } from "@/lib/supabase/server";

type Svc = ReturnType<typeof createServiceClient>;

export type SentinelSeverity = "high" | "medium" | "low";

/** A one-click remedy for a finding. Only reversible, single-row operations
 *  qualify — anything that destroys learner history stays report-only.
 *
 *  `auto` marks a fix the nightly cron may apply WITHOUT a human. That is a
 *  strictly narrower bar than "has a fix button", and three rules decide it:
 *  the write must be reversible, it must be a single row, and it must not send
 *  email. The last one is the important one — an email can't be unsent, so
 *  anything that mails a learner or a family stays a human decision no matter
 *  how safe the database write is. */
export type SentinelFix =
  | {
      kind: "assign_instructor";
      label: string;
      studentId: string;
      trackSlug: string;
      programId: string;
      /** Auto-eligible: an idempotent upsert of one scoping row, undone by
       *  deleting it, and nobody is emailed. */
      auto?: boolean;
    }
  | {
      kind: "unenroll";
      label: string;
      studentId: string;
      trackSlug: string;
      /** Never auto. It is a DELETE against enrollment, and "this staff
       *  enrollment is intentional" is a judgement the finding's own message
       *  says out loud. */
      auto?: boolean;
    };

/** One reported item inside a finding.
 *
 *  `label` is what a human reads and often embeds a live count ("3 session(s)
 *  held"). `key` is the STABLE identity of the underlying issue, which is what
 *  a dismissal is recorded against — keying a dismissal on the label would
 *  un-dismiss the row the moment one of those numbers moved. Checks whose label
 *  carries no volatile number can pass a plain string and get key === label. */
export type SentinelRow = { label: string; key: string };

export type SentinelFinding = {
  check: string;
  severity: SentinelSeverity;
  message: string;
  rows: SentinelRow[];
  fixes?: SentinelFix[];
};

const SEVERITY_ORDER: Record<SentinelSeverity, number> = { high: 0, medium: 1, low: 2 };

/**
 * Which program owns which form. Mirrors `appliesToPrograms` in the program
 * configs — a response filed anywhere else is misfiled, which is what put a
 * Catalyst Participation Agreement in Beyond the Game's Insights.
 */
const FORM_OWNERS: Record<string, string | null> = {
  "pre-survey-spring-2026": "beyond-code-centers",
  "post-survey-spring-2026": "beyond-code-centers",
  "catalyst-participation-agreement": "catalyst",
  "comptia-security-agreement": "catalyst",
  "comptia-security-pre": "catalyst",
  "security-plus-application": "catalyst",
  "network-plus-post": "catalyst",
  "home-for-summer-application": "catalyst",
  "mid-program-spring-2026": null, // shared instrument: ATG and BCC both run it
  "bcc-learner-intake": null, // platform-wide
  "learn-more": null, // platform-wide lead capture
};

// Big enough to clear every table at current scale; PostgREST's default page
// (1000 rows) silently truncates, which would make checks pass by omission.
const LIMIT = 10000;

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function runSentinelChecks(svc: Svc): Promise<SentinelFinding[]> {
  const findings: SentinelFinding[] = [];
  const report = (
    check: string,
    severity: SentinelSeverity,
    message: string,
    found: (string | SentinelRow)[],
    fixes?: SentinelFix[],
  ) =>
    findings.push({
      check,
      severity,
      message,
      rows: found.map((r) => (typeof r === "string" ? { label: r, key: r } : r)),
      fixes,
    });

  const programs = await rows<{ id: string; slug: string }>(
    svc.from("programs").select("id, slug").limit(LIMIT),
  );
  const slugOf = Object.fromEntries(programs.map((p) => [p.id, p.slug]));

  // ── 1. Responses filed under a program that doesn't own the form ─────────
  for (const table of ["survey_responses", "public_survey_responses"]) {
    const responses = await rows<{ id: string; survey_type: string; program_id: string | null }>(
      svc.from(table).select("id, survey_type, program_id").limit(LIMIT),
    );
    const bad = responses.filter((r) => {
      const owner = FORM_OWNERS[r.survey_type];
      return owner && slugOf[r.program_id ?? ""] !== owner;
    });
    if (bad.length) {
      // Keyed on (form, program it was filed under) so the row survives the
      // count moving; the count lives in the label only.
      const byForm: Record<string, { label: string; n: number }> = {};
      for (const r of bad) {
        const filedUnder = slugOf[r.program_id ?? ""] ?? "?";
        const k = `${r.survey_type}|${filedUnder}`;
        byForm[k] ??= {
          label: `${r.survey_type}: filed under ${filedUnder}, owned by ${FORM_OWNERS[r.survey_type]}`,
          n: 0,
        };
        byForm[k].n += 1;
      }
      report(
        `misfiled-responses (${table})`,
        "high",
        "A response is filed under the respondent's program instead of the form's owner — it shows up in Insights for a program that doesn't own that form.",
        Object.entries(byForm).map(([key, v]) => ({ label: `${v.n} × ${v.label}`, key })),
      );
    }
  }

  // ── 2. Staff counted as enrolled learners ────────────────────────────────
  const enrollments = await rows<{ student_id: string; track_slug: string }>(
    svc.from("student_tracks").select("student_id, track_slug").limit(LIMIT),
  );
  const enrolledIds = [...new Set(enrollments.map((e) => e.student_id))];
  type Person = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
    is_staff: boolean | null;
    is_test: boolean | null;
  };
  const people = enrolledIds.length
    ? await rows<Person>(
        svc
          .from("students")
          .select("id, first_name, last_name, email, role, is_staff, is_test")
          .in("id", enrolledIds)
          .limit(LIMIT),
      )
    : [];
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));
  const staffEnrolled = enrollments.filter((e) => {
    const p = personById[e.student_id];
    return p && (p.role !== "student" || p.is_staff || p.is_test);
  });
  if (staffEnrolled.length) {
    const byTrack: Record<string, string[]> = {};
    for (const e of staffEnrolled)
      (byTrack[e.track_slug] ??= []).push(personById[e.student_id].email);
    report(
      "staff-enrolled-as-learners",
      "medium",
      "Staff hold enrollments, which inflates roster and completion-rate denominators. Fine if intentional — the analytics exclude them — but every one is a course whose 'enrolled' count reads high in any surface that forgets to filter.",
      // Keyed on the course alone: dismissing this says "staff on this course
      // is intentional", which stays true when another staff member is added.
      Object.entries(byTrack).map(([t, e]) => ({ label: `${t}: ${e.join(", ")}`, key: t })),
      staffEnrolled.map((e) => ({
        kind: "unenroll" as const,
        label: `Unenroll ${personById[e.student_id].email} from ${e.track_slug}`,
        studentId: e.student_id,
        trackSlug: e.track_slug,
      })),
    );
  }

  const learnerIds = new Set(
    people.filter((p) => p.role === "student" && !p.is_staff && !p.is_test).map((p) => p.id),
  );

  // ── 3. Finished courses with no certificates issued ──────────────────────
  // Completion is only ever recorded by issuing a certificate, so a course that
  // ran and never issued reads 0% forever.
  const attendance = await rows<{
    student_id: string;
    track: string;
    week_number: number;
    session_number: number | null;
  }>(
    svc.from("attendance").select("student_id, track, week_number, session_number").limit(LIMIT),
  );
  const completions = await rows<{ student_id: string; track_slug: string }>(
    svc.from("track_completions").select("student_id, track_slug").limit(LIMIT),
  );
  const attendedTracks = [...new Set(attendance.map((a) => a.track))];
  const certsByTrack: Record<string, Set<string>> = {};
  for (const c of completions) (certsByTrack[c.track_slug] ??= new Set()).add(c.student_id);
  const noCerts = attendedTracks.filter((t) => !certsByTrack[t]?.size);
  if (noCerts.length) {
    report(
      "attended-but-no-certificates",
      "medium",
      "Learners attended sessions but no certificate was ever issued, so the course reports 0% completion however far they got.",
      noCerts.map((t) => {
        const held = new Set(
          attendance.filter((a) => a.track === t).map((a) => `${a.week_number}-${a.session_number}`),
        ).size;
        return { label: `${t}: ${held} session(s) held, 0 certificates`, key: t };
      }),
    );
  }

  // ── 4. Certificates for people who aren't enrolled ───────────────────────
  const enrolledPairs = new Set(enrollments.map((e) => `${e.student_id}|${e.track_slug}`));
  const orphanCerts = completions.filter(
    (c) => !enrolledPairs.has(`${c.student_id}|${c.track_slug}`),
  );
  if (orphanCerts.length) {
    report(
      "certificate-without-enrollment",
      "high",
      "A certificate exists for someone with no enrollment in that course — it can't be counted in the completion rate, so issued and completed disagree.",
      orphanCerts.map((c) => `${c.track_slug}: ${personById[c.student_id]?.email ?? c.student_id}`),
    );
  }

  // ── 5. Attendance for someone not enrolled ───────────────────────────────
  const strayAttendance = [
    ...new Set(
      attendance
        .filter((a) => !enrolledPairs.has(`${a.student_id}|${a.track}`))
        .map((a) => `${a.track}|${a.student_id}`),
    ),
  ];
  if (strayAttendance.length) {
    report(
      "attendance-without-enrollment",
      "medium",
      "Someone checked into a course they're not enrolled in — they're invisible to the roster but their check-ins still count toward sessions held.",
      strayAttendance.map((k) => {
        const [t, id] = k.split("|");
        return `${t}: ${personById[id]?.email ?? id}`;
      }),
    );
  }

  // ── 6. Courses whose named instructor isn't assigned ─────────────────────
  // The header reads "with Kobie Joyner" off config text; the admin panel scopes
  // off instructor_tracks. When they disagree, an instructor sees every course
  // in the program instead of their own.
  const overrides = await rows<{
    track_slug: string;
    instructor: string | null;
    program_id: string;
    archived_at: string | null;
    start_date: string | null;
    name: string | null;
  }>(
    svc
      .from("track_overrides")
      .select("track_slug, instructor, program_id, archived_at, start_date, name")
      .limit(LIMIT),
  );
  const instrTracks = await rows<{ student_id: string; track_slug: string }>(
    svc.from("instructor_tracks").select("student_id, track_slug").limit(LIMIT),
  );
  const staffAccounts = await rows<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  }>(
    svc
      .from("students")
      .select("id, first_name, last_name, email, role")
      .in("role", ["instructor", "admin", "super_admin"])
      .limit(LIMIT),
  );
  const assignedByTrack: Record<string, Set<string>> = {};
  for (const r of instrTracks) (assignedByTrack[r.track_slug] ??= new Set()).add(r.student_id);
  const nameOf = (p: { first_name: string | null; last_name: string | null }) =>
    `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
  const unassigned: string[] = [];
  const unassignedFixes: SentinelFix[] = [];
  for (const t of overrides) {
    if (t.archived_at || !t.instructor) continue;
    const named = t.instructor.trim().toLowerCase();
    if (["tbd", "beyond code collective", "replit"].includes(named)) continue;
    const account = staffAccounts.find((p) => nameOf(p) === named);
    // A named instructor with no account is not a finding. Plenty of courses
    // are taught by people who never log in, and flagging it every run just
    // trains you to skim past the section that does matter.
    if (!account) continue;
    if (!assignedByTrack[t.track_slug]?.has(account.id)) {
      unassigned.push(
        `${t.track_slug}: ${t.instructor} is named but not assigned (instructor_tracks)`,
      );
      unassignedFixes.push({
        kind: "assign_instructor",
        auto: true,
        label: `Assign ${t.instructor} to ${t.track_slug}`,
        studentId: account.id,
        trackSlug: t.track_slug,
        programId: t.program_id,
      });
    }
  }
  if (unassigned.length) {
    report(
      "instructor-named-but-not-assigned",
      "medium",
      "An instructor WITH an account is named on a course but not assigned to it. Course scoping reads instructor_tracks, so they see the whole program's roster instead of their own course.",
      unassigned,
      unassignedFixes,
    );
  }

  // ── 7. Hidden courses that still have active learners ────────────────────
  const hidden = await rows<{ track_slug: string }>(
    svc.from("hidden_courses").select("track_slug").limit(LIMIT),
  );
  const hiddenWithLearners = hidden
    .map((h) => {
      const n = enrollments.filter(
        (e) => e.track_slug === h.track_slug && learnerIds.has(e.student_id),
      ).length;
      return n > 0
        ? { label: `${h.track_slug}: ${n} enrolled learner(s)`, key: h.track_slug }
        : null;
    })
    .filter((x): x is SentinelRow => x !== null);
  if (hiddenWithLearners.length) {
    report(
      "hidden-course-with-learners",
      "low",
      "A retired course still has enrolled learners. Expected when you retire something mid-flight — listed so it's a decision, not a surprise.",
      hiddenWithLearners,
    );
  }

  // ── 8. Enrollments in courses that no longer exist ───────────────────────
  const knownSlugs = new Set(overrides.map((t) => t.track_slug));
  const unknown = [...new Set(enrollments.map((e) => e.track_slug))].filter(
    (s) => !knownSlugs.has(s),
  );
  if (unknown.length) {
    report(
      "enrollment-in-unknown-course",
      "low",
      "Enrollments point at a slug with no track_overrides row. Harmless if the course is defined in TypeScript; a leak if it was deleted.",
      unknown.map((s) => {
        const n = enrollments.filter((e) => e.track_slug === s).length;
        return { label: `${s}: ${n} enrollment(s)`, key: s };
      }),
    );
  }

  // ── 9. Course starts this week with an empty roster ──────────────────────
  // The Endless Bootcamp lesson: nobody notices an empty roster until the day
  // before kickoff. Seven days out is enough runway to send invites.
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekOutIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const hiddenSlugs = new Set(hidden.map((h) => h.track_slug));
  const learnersByTrack: Record<string, number> = {};
  for (const e of enrollments) {
    if (learnerIds.has(e.student_id)) {
      learnersByTrack[e.track_slug] = (learnersByTrack[e.track_slug] ?? 0) + 1;
    }
  }
  const startingSoon = overrides.filter(
    (t) =>
      !t.archived_at &&
      !hiddenSlugs.has(t.track_slug) &&
      t.start_date &&
      t.start_date >= todayIso &&
      t.start_date <= weekOutIso,
  );
  const emptyRoster = startingSoon.filter((t) => !(learnersByTrack[t.track_slug] > 0));
  if (emptyRoster.length) {
    report(
      "upcoming-course-empty-roster",
      "high",
      "A course starts within 7 days and has zero enrolled learners. If invites went out, nobody has joined; if they didn't, there's still time.",
      // Keyed with the start date so acknowledging one kickoff never silences
      // the next cohort's.
      emptyRoster.map((t) => ({
        label: `${t.name ?? t.track_slug}: starts ${t.start_date}, 0 learners`,
        key: `${t.track_slug}|${t.start_date}`,
      })),
    );
  }

  // ── 10. Course starts this week with no meeting link ─────────────────────
  const soonKeys = startingSoon.map((t) => t.track_slug);
  if (soonKeys.length) {
    const firstSessions = await rows<{
      track: string;
      program_id: string;
      meeting_link: string | null;
    }>(
      svc
        .from("session_content")
        .select("track, program_id, meeting_link")
        .eq("week_number", 1)
        .in("track", soonKeys)
        .limit(LIMIT),
    );
    const linkByTrack = new Map(
      firstSessions.map((s) => [`${s.program_id}|${s.track}`, s.meeting_link]),
    );
    const noLink = startingSoon.filter(
      (t) => !linkByTrack.get(`${t.program_id}|${t.track_slug}`),
    );
    if (noLink.length) {
      report(
        "upcoming-course-no-meeting-link",
        "medium",
        "A course starts within 7 days and session 1 has no meeting link — learners will hit a join page with nowhere to go.",
        noLink.map((t) => ({
          label: `${t.name ?? t.track_slug}: starts ${t.start_date}`,
          key: `${t.track_slug}|${t.start_date}`,
        })),
      );
    }
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return findings;
}
