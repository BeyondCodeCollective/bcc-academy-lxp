#!/usr/bin/env node
/**
 * Read-only data audit. Every check here is a rule that was broken in
 * production at least once — each one cost a "why is this showing?" and an
 * investigation. Written down, they get checked identically every time instead
 * of re-derived by eye.
 *
 *   node --env-file=.env.local scripts/audit-data.mjs
 *   node --env-file=.env.local scripts/audit-data.mjs --json
 *
 * Never writes. Prints findings and exits 1 when any are found, so it can gate
 * a deploy or run on a schedule.
 */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
const asJson = process.argv.includes("--json");

async function q(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const body = await res.json();
  if (!Array.isArray(body)) {
    throw new Error(`Query failed (${path}): ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

/**
 * Which program owns which form. Mirrors `appliesToPrograms` in the program
 * configs — a response filed anywhere else is misfiled, which is what put a
 * Catalyst Participation Agreement in Beyond the Game's Insights.
 */
const FORM_OWNERS = {
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

const findings = [];
const report = (check, severity, message, rows = []) =>
  findings.push({ check, severity, message, rows });

async function main() {
  const programs = await q("programs?select=id,slug");
  const slugOf = Object.fromEntries(programs.map((p) => [p.id, p.slug]));
  const idOf = Object.fromEntries(programs.map((p) => [p.slug, p.id]));

  // ── 1. Responses filed under a program that doesn't own the form ─────────
  for (const table of ["survey_responses", "public_survey_responses"]) {
    const rows = await q(`${table}?select=id,survey_type,program_id`);
    const bad = rows.filter((r) => {
      const owner = FORM_OWNERS[r.survey_type];
      return owner && slugOf[r.program_id] !== owner;
    });
    if (bad.length) {
      const byForm = {};
      for (const r of bad) {
        const k = `${r.survey_type}: filed under ${slugOf[r.program_id] ?? "?"}, owned by ${FORM_OWNERS[r.survey_type]}`;
        byForm[k] = (byForm[k] ?? 0) + 1;
      }
      report(
        `misfiled-responses (${table})`,
        "high",
        "A response is filed under the respondent's program instead of the form's owner — it shows up in Insights for a program that doesn't own that form.",
        Object.entries(byForm).map(([k, n]) => `${n} × ${k}`),
      );
    }
  }

  // ── 2. Staff counted as enrolled learners ────────────────────────────────
  // Instructors/admins sit in student_tracks so they can see a course. Counting
  // them as enrolled inflated Tech+ to 8 learners and halved its completion rate.
  const enrollments = await q("student_tracks?select=student_id,track_slug");
  const enrolledIds = [...new Set(enrollments.map((e) => e.student_id))];
  const people = enrolledIds.length
    ? await q(`students?select=id,first_name,last_name,email,role,is_staff,is_test&id=in.(${enrolledIds.join(",")})`)
    : [];
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));
  const staffEnrolled = enrollments.filter((e) => {
    const p = personById[e.student_id];
    return p && (p.role !== "student" || p.is_staff || p.is_test);
  });
  if (staffEnrolled.length) {
    const byTrack = {};
    for (const e of staffEnrolled) (byTrack[e.track_slug] ??= []).push(personById[e.student_id].email);
    report(
      "staff-enrolled-as-learners",
      "medium",
      "Staff hold enrollments, which inflates roster and completion-rate denominators. Fine if intentional — the analytics now exclude them — but every one is a course whose 'enrolled' count reads high in any surface that forgets to filter.",
      Object.entries(byTrack).map(([t, e]) => `${t}: ${e.join(", ")}`),
    );
  }

  const learnerIds = new Set(
    people.filter((p) => p.role === "student" && !p.is_staff && !p.is_test).map((p) => p.id),
  );

  // ── 3. Finished courses with no certificates issued ──────────────────────
  // Completion is only ever recorded by issuing a certificate, so a course that
  // ran and never issued reads 0% forever.
  const attendance = await q("attendance?select=student_id,track,week_number,session_number");
  const completions = await q("track_completions?select=student_id,track_slug");
  const attendedTracks = [...new Set(attendance.map((a) => a.track))];
  const certsByTrack = {};
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
        return `${t}: ${held} session(s) held, 0 certificates`;
      }),
    );
  }

  // ── 4. Certificates for people who aren't enrolled learners ──────────────
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
  const overrides = await q("track_overrides?select=track_slug,instructor,program_id,archived_at");
  const instrTracks = await q("instructor_tracks?select=student_id,track_slug");
  const staffAccounts = await q("students?select=id,first_name,last_name,email,role&role=in.(instructor,admin,super_admin)");
  const assignedByTrack = {};
  for (const r of instrTracks) (assignedByTrack[r.track_slug] ??= new Set()).add(r.student_id);
  const nameOf = (p) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
  const unassigned = [];
  for (const t of overrides) {
    if (t.archived_at || !t.instructor) continue;
    const named = t.instructor.trim().toLowerCase();
    if (["tbd", "beyond code collective", "replit"].includes(named)) continue;
    const account = staffAccounts.find((p) => nameOf(p) === named);
    if (!account) {
      unassigned.push(`${t.track_slug}: "${t.instructor}" has no staff account`);
    } else if (!assignedByTrack[t.track_slug]?.has(account.id)) {
      unassigned.push(`${t.track_slug}: ${t.instructor} is named but not assigned (instructor_tracks)`);
    }
  }
  if (unassigned.length) {
    report(
      "instructor-named-but-not-assigned",
      "medium",
      "The course names an instructor who isn't assigned to it. Course scoping reads instructor_tracks, so an unassigned instructor sees the whole program's roster instead of their own course.",
      unassigned,
    );
  }

  // ── 7. Hidden courses that still have active learners ────────────────────
  const hidden = await q("hidden_courses?select=track_slug");
  const hiddenWithLearners = hidden
    .map((h) => {
      const n = enrollments.filter(
        (e) => e.track_slug === h.track_slug && learnerIds.has(e.student_id),
      ).length;
      return n > 0 ? `${h.track_slug}: ${n} enrolled learner(s)` : null;
    })
    .filter(Boolean);
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
        return `${s}: ${n} enrollment(s)`;
      }),
    );
  }

  // ── Output ───────────────────────────────────────────────────────────────
  if (asJson) {
    console.log(JSON.stringify({ findings }, null, 2));
  } else if (findings.length === 0) {
    console.log("✓ No findings. Every invariant holds.");
  } else {
    const order = { high: 0, medium: 1, low: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);
    for (const f of findings) {
      console.log(`\n[${f.severity.toUpperCase()}] ${f.check}`);
      console.log(`  ${f.message}`);
      for (const r of f.rows) console.log(`    · ${r}`);
    }
    console.log(`\n${findings.length} finding(s).`);
  }
  process.exit(findings.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Audit failed:", e.message);
  process.exit(2);
});
