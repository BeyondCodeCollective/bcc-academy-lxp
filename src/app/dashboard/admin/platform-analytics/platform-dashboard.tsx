import Link from "next/link";
import type { PlatformAnalytics } from "@/lib/analytics/platform";
import { RANGE_LABELS, type Delta, type RangePreset } from "@/lib/analytics/period";
import { StatCard, type StatTrend } from "@/components/stats/stat-card";
import { SectionHeadline } from "@/components/stats/section-headline";
import { DataBar } from "@/components/stats/data-bar";
import { DataTable, Num, microLabel } from "@/components/ui";

// Presentational. Every value is a prop, and there is no client JS on this page
// — the range switcher is a set of links, so the whole surface stays a Server
// Component and the numbers can never be a stale client cache.

function trendFor(d: Delta): StatTrend | undefined {
  // No chip when the prior window was zero: an "∞%" jump is noise, not signal.
  if (d.pct === null) return undefined;
  return {
    dir: d.dir,
    text: `${Math.abs(d.pct)}%`,
    good: d.dir === "up",
    vs: d.prev.toLocaleString(),
  };
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function RangeLinks({ active }: { active: RangePreset }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-paper-tint p-1">
      {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => (
        <Link
          key={p}
          href={`/dashboard/admin/platform-analytics?range=${p}`}
          aria-current={p === active ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            p === active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          {RANGE_LABELS[p]}
        </Link>
      ))}
    </div>
  );
}

export function PlatformDashboard({ data }: { data: PlatformAnalytics }) {
  const { totals, programs, courses, signupsByMonth, trends } = data;
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-10">
      {/* ─── The platform, in six numbers ─────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="Scale"
          headline={`${totals.learners.toLocaleString()} learners across ${totals.programs} programs`}
          sub="Every program, every course, every account — one total. Learners exclude staff and test logins, so these are the numbers you can quote."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            value={totals.learners.toLocaleString()}
            label="Learners"
            hint={`+${totals.newLearners30.toLocaleString()} in the last 30 days`}
            info="Accounts with role student, excluding staff and test logins, across every program."
          />
          <StatCard
            value={totals.enrollments.toLocaleString()}
            label="Enrollments"
            hint={
              totals.learners > 0
                ? `${(totals.enrollments / totals.learners).toFixed(1)} courses per learner`
                : undefined
            }
            info="student_tracks rows held by learners. One learner in three courses counts three."
          />
          <StatCard
            value={totals.engagedLearners.toLocaleString()}
            label="Engaged learners"
            hint={`${pct(totals.engagementRate)} of all learners`}
            info="Learners who did the work at least once: attended, watched a lesson, submitted, or reflected."
          />
          <StatCard
            value={totals.certificates.toLocaleString()}
            label="Certificates issued"
            info="track_completions rows — completion is a decision an admin makes, not something the platform infers."
          />
          <StatCard
            value={totals.programs.toLocaleString()}
            label="Programs"
            hint={`${totals.courses.toLocaleString()} active courses`}
            info="Programs with at least one learner or course. Archived courses are excluded from the course count."
          />
          <StatCard
            value={totals.activeLast30.toLocaleString()}
            label="Active (30 days)"
            hint={`${totals.activeLast7.toLocaleString()} in the last 7`}
            info="Learners with any recorded activity in the window (students.last_activity_at — behaviour, not sign-in)."
          />
        </div>
      </section>

      {/* ─── Movement ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="Movement"
          headline="What moved, and against what"
          sub="Only metrics with a real event timestamp appear here. Current-state totals have no stored history, so a delta on them would be invented."
          actions={<RangeLinks active={trends.range} />}
        />
        <p className="text-xs text-ink-faint">
          {trends.periodLabel} · vs previous period
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {(
            [
              ["Active learners", trends.activeLearners],
              ["Lessons watched", trends.lessonsWatched],
              ["Sessions attended", trends.attended],
              ["Work submitted", trends.submitted],
              ["New enrollments", trends.enrollments],
              ["Certificates", trends.certificates],
            ] as const
          ).map(([label, d]) => (
            <StatCard
              key={label}
              value={d.value.toLocaleString()}
              label={label}
              trend={trendFor(d)}
            />
          ))}
        </div>
      </section>

      {/* ─── All-time volume ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="All time"
          headline="Everything the platform has recorded"
          sub="Lifetime counts, not windowed. Learner-owned activity is attributed to the learner's program, so staff and test accounts never appear in a total."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard value={totals.lessonsWatched.toLocaleString()} label="Lessons watched" />
          <StatCard value={totals.sessionsAttended.toLocaleString()} label="Session check-ins" />
          <StatCard value={totals.submissions.toLocaleString()} label="Work submitted" />
          <StatCard value={totals.reflections.toLocaleString()} label="Reflections" />
          <StatCard
            value={totals.surveysCompleted.toLocaleString()}
            label="Surveys completed"
            info="Authenticated survey responses from learners plus anonymous public responses."
          />
          <StatCard value={totals.tutorMessages.toLocaleString()} label="Tutor messages" />
          <StatCard
            value={totals.activityEvents.toLocaleString()}
            label="Activity events"
            info="The append-only event log (logins, page views, video progress). Platform-wide, including staff."
          />
          <StatCard
            value={(totals.staffAccounts + totals.adminAccounts).toLocaleString()}
            label="Staff & admins"
            hint={`${totals.staffAccounts.toLocaleString()} staff · ${totals.adminAccounts.toLocaleString()} admin roles`}
            info="Accounts held out of every learner total above."
          />
        </div>
      </section>

      {/* ─── Reach ────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="Reach"
          headline="From invited to doing the work"
          sub="The platform-wide funnel. Invited counts allowlisted emails across every course; landing signups are top-of-funnel leads that may never create an account."
        />
        <div className="panel p-5 sm:p-6">
          <DataBar
            items={[
              { label: "Invited (allowlist)", value: totals.invitedEmails },
              { label: "Landing signups", value: totals.landingSignups },
              { label: "Accounts created", value: totals.learners },
              { label: "Engaged", value: totals.engagedLearners },
              { label: "Certified", value: totals.certificates },
            ]}
          />
        </div>
      </section>

      {/* ─── Per program ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="By program"
          headline="Where the platform's weight sits"
          sub="Each column sums to the platform total above — activity is attributed to the learner's program, not the event's."
        />
        <DataTable
          columns={[
            "Program",
            { label: "Courses", align: "right" },
            { label: "Learners", align: "right" },
            { label: "Enrolled", align: "right" },
            { label: "Engaged", align: "right" },
            { label: "Rate", align: "right" },
            { label: "Active 30d", align: "right" },
            { label: "Lessons", align: "right" },
            { label: "Attended", align: "right" },
            { label: "Submitted", align: "right" },
            { label: "Certs", align: "right" },
          ]}
        >
          {programs.map((p) => (
            <tr key={p.slug}>
              <td className="px-4 py-3">
                <span className="font-medium text-ink">{p.name}</span>
                {p.isDynamic && (
                  <span className="ml-2 rounded-full bg-paper-tint px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-ink-faint">
                    org
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right"><Num value={p.courses} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.learners} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.enrollments} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.engaged} /></td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                {pct(p.engagementRate)}
              </td>
              <td className="px-4 py-3 text-right"><Num value={p.active30} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.lessons} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.attended} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.submitted} /></td>
              <td className="px-4 py-3 text-right"><Num value={p.certificates} /></td>
            </tr>
          ))}
          <tr className="bg-paper-tint-soft font-semibold">
            <td className={`px-4 py-3 ${microLabel} text-ink`}>Platform</td>
            <td className="px-4 py-3 text-right"><Num value={totals.courses} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.learners} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.enrollments} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.engagedLearners} /></td>
            <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
              {pct(totals.engagementRate)}
            </td>
            <td className="px-4 py-3 text-right"><Num value={totals.activeLast30} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.lessonsWatched} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.sessionsAttended} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.submissions} /></td>
            <td className="px-4 py-3 text-right"><Num value={totals.certificates} /></td>
          </tr>
        </DataTable>
      </section>

      {/* ─── Per course ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="By course"
          headline={`${courses.length} courses with a roster`}
          sub="Every course on the platform that has at least one enrollment, ranked. Engaged here means engaged IN THAT COURSE, not anywhere."
        />
        <DataTable
          columns={[
            "Course",
            "Program",
            { label: "Enrolled", align: "right" },
            { label: "Engaged", align: "right" },
            { label: "Rate", align: "right" },
            { label: "Certs", align: "right" },
          ]}
        >
          {courses.map((c) => (
            <tr key={c.slug}>
              <td className="px-4 py-3">
                <span className="font-medium text-ink">{c.name}</span>
                {c.archived && (
                  <span className="ml-2 rounded-full bg-paper-tint px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-ink-faint">
                    archived
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-ink-soft">{c.program}</td>
              <td className="px-4 py-3 text-right"><Num value={c.enrollments} /></td>
              <td className="px-4 py-3 text-right"><Num value={c.engaged} /></td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                {pct(c.enrollments > 0 ? (c.engaged / c.enrollments) * 100 : 0)}
              </td>
              <td className="px-4 py-3 text-right"><Num value={c.certificates} /></td>
            </tr>
          ))}
        </DataTable>
      </section>

      {/* ─── Growth ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeadline
          eyebrow="Growth"
          headline="Learner signups, last 12 months"
          sub="Accounts created per month, platform-wide."
        />
        <div className="panel p-5 sm:p-6">
          <DataBar
            items={signupsByMonth.map((m) => ({
              label: monthLabel(m.month),
              value: m.count,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
