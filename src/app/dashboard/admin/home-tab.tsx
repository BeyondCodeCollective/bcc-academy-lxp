"use client";

import { LinkPending } from "@/components/link-pending";
import Link from "next/link";
import type { StudentTrackRow } from "./actions";
import { canSwitchPrograms, canViewInsights } from "@/lib/roles";
import { isLearner } from "@/lib/analytics/engagement";
import { Eye, ArrowRight } from "@phosphor-icons/react";
import { HomeBand } from "@/components/home-band";
import { scheduledSessions, nextSession, weekRail, bandSentence, trackCode } from "@/lib/home-band";
import { Section } from "@/components/page-header";
import { computeCurrentWeek, trackHasStarted, formatCohortDate, easternDayKey } from "@/lib/utils";
import { ManageMenu } from "./manage-menu";
import { type StudentRow, type AdminTrackConfig } from "./admin-shared";
import { AdminTopTabs } from "./admin-top-tabs";
import { countLabel } from "@/lib/count-label";

type HomeTabProps = {
  courseStats: { [x: string]: { total: number; active: number; fullAttendance: number | null; sessionsHeld: number; certificates?: number; }; };
  enrollments: StudentTrackRow[];
  isManager: boolean;
  isMaster: boolean;
  liveTrackNames: { [x: string]: { name: string; instructor: string; }; };
  programSlug: string;
  students: StudentRow[];
  tracks: AdminTrackConfig[];
  userRole: string;
};

export function HomeTab({
  courseStats,
  enrollments,
  isManager,
  isMaster,
  liveTrackNames,
  programSlug,
  students,
  tracks,
  userRole,
}: HomeTabProps) {
  const studentRoleIds = new Set(
    students.filter(isLearner).map((s) => s.id),
  );
  // `courseStats` is server-computed: it resolves role by enrolled id
  // rather than by program (so learners whose students.program_id points
  // elsewhere still count), and unions attendance / submissions / lessons
  // / tutor chat / browsing for "active" (so a live Zoom camp isn't 0).
  // The client-side fallbacks below are the old, narrower answers, used
  // only when the server didn't supply stats.
  const studentCountFor = (slug: string) =>
    courseStats[slug]?.total ??
    enrollments.filter(
      (e) => e.track_slug === slug && studentRoleIds.has(e.student_id),
    ).length;
  const now = new Date();
  // Cross-course triage: "N active this week" per course. Only worth the
  // extra number on a multi-course home — a 1–2 course picker keeps the
  // plain enrolled count.
  const showActive = tracks.length >= 3;
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const activeStudentIds = new Set(
    students
      .filter((s) => {
        if (s.role !== "student") return false;
        // Behavior only. last_activity_at advances on every dashboard
        // visit and is now reliably written; last_seen_at is a login
        // stamp (set at signup) and read a fresh cohort as 100% active.
        const signal = s.last_activity_at;
        return !!signal && new Date(signal).getTime() >= weekAgo;
      })
      .map((s) => s.id),
  );
  const activeCountFor = (slug: string) =>
    courseStats[slug]?.active ??
    enrollments.filter(
      (e) => e.track_slug === slug && activeStudentIds.has(e.student_id),
    ).length;

  return (
    <div className="space-y-8">
      <AdminTopTabs
        current="courses"
        showInsights={canViewInsights(userRole)}
        actions={isManager && <ManageMenu isMaster={isMaster} isSuper={canSwitchPrograms(userRole)} programSlug={programSlug} />}
        isManager={isManager}
      />

      {(() => {
        // Phase partition (redesign 2026-07-13): running courses lead with
        // their live numbers, upcoming wait below, completed close the page
        // — the admin's scan order, not config order. Falls back to the
        // date-derived started flag when the server sent no phase.
        const phaseOf = (t: (typeof tracks)[number]) =>
          t.phase ??
          (trackHasStarted(t, now) ? "running" : "upcoming");
        const running = tracks.filter((t) => phaseOf(t) === "running");
        const upcoming = tracks.filter((t) => phaseOf(t) === "upcoming");
        const completed = tracks.filter((t) => phaseOf(t) === "ended");

        // ── The band ──────────────────────────────────────────────
        // This screen used to open with a list grouped by lifecycle and
        // two unlabeled numbers — it answered "what courses exist", not
        // "what needs me today". The band answers the second question in
        // a sentence, and the rail shows the week it sits in.
        //
        // Only running and upcoming courses are scheduled: a finished
        // cohort has dates in the past and would otherwise crowd the
        // rail with sessions nobody is going to.
        const bandSessions = scheduledSessions([...running, ...upcoming]);
        const bandNext = nextSession(bandSessions, now);
        const bandRail = weekRail(bandSessions, now);
        const { headline: bandHeadline, sub: bandSub } = bandSentence(bandNext, now);
        const activeTotal = running.reduce(
          (sum, t) => sum + activeCountFor(t.slug),
          0,
        );
        // "Needs you" is deliberately narrow: a course that opens inside
        // a fortnight with nobody enrolled is the one thing on this page
        // that gets worse while you don't look at it.
        const needsYou = upcoming.filter((t) => {
          if (!t.startDate) return false;
          const days =
            (Date.parse(`${t.startDate}T12:00:00Z`) - now.getTime()) / 86_400_000;
          return days <= 14 && studentCountFor(t.slug) === 0;
        });

        const renderRow = (t: (typeof tracks)[number]) => {
          const started = trackHasStarted(t, now);
          // `currentUnit` comes from resolveCurrentUnit, which honors
          // dated syllabi and per-unit unlocks. computeCurrentWeek only
          // knows a 7-day cycle, so on a day-gated camp it reports Day 1
          // for the whole camp. Fall back to it only when the server
          // didn't supply a unit.
          const currentWeek = started
            ? (t.currentUnit ??
                computeCurrentWeek(
                  t.startDate,
                  t.totalWeeks,
                  t.lastSessionDayOffset,
                ))
            : 0;
          const ended = t.phase === "ended";
          // Only a running course can have active learners. Before it
          // starts, "0 / 20 active" is as misleading as it is after it
          // ends. Fall back to `started` when the server sent no phase.
          const isRunning = t.phase ? t.phase === "running" : started;
          const count = studentCountFor(t.slug);
          // "Active this week" is a rolling window, so a finished course
          // decays to 0 and reads as failure rather than as "it's done".
          // Once a course has ended, report its outcome instead: how many
          // learners made every session. Labeled as exactly that —
          // "completed" means a certificate, and Roblox read 36 "completed"
          // next to 58 certificates (audit F16).
          const completed = ended ? (courseStats[t.slug]?.fullAttendance ?? null) : null;
          // A finished course with no certificates issued isn't a course
          // nobody completed — it's one nobody has recorded yet, and it
          // reads as 0% everywhere until someone does. Say so on the row,
          // where the person who can fix it is already looking.
          const awaitingCertificates =
            ended && count > 0 && (courseStats[t.slug]?.certificates ?? 0) === 0;
          // A metric with no label is a riddle. "9 / 17" meant nothing
          // without reading activeCountFor, so every number now says what
          // it counts — and they get room to breathe rather than three
          // columns jammed against each other.
          const metrics: { label: string; value: React.ReactNode }[] = [];
          if (t.type !== "single-event" && !t.startDateTbd && started && !ended) {
            metrics.push({
              label: t.selfPaced ? "Length" : "Progress",
              value: t.selfPaced
                ? countLabel(t.totalWeeks, (t.unitLabel || "Week").toLowerCase())
                : `${t.unitLabel || "Week"} ${currentWeek} of ${t.totalWeeks}`,
            });
          }
          if (completed !== null) {
            metrics.push({
              label: "Finished every session",
              value: (
                <>
                  <span className="font-semibold">{completed}</span>
                  <span className="text-ink-faint"> of {count}</span>
                </>
              ),
            });
          } else if (showActive && isRunning) {
            metrics.push({
              label: "Active this week",
              value: (
                <>
                  <span className="font-semibold">{activeCountFor(t.slug)}</span>
                  <span className="text-ink-faint"> of {count}</span>
                </>
              ),
            });
          } else {
            metrics.push({
              label: "Roster",
              value: `${count} ${count === 1 ? "student" : "students"}`,
            });
          }
          if (!started && !ended) {
            metrics.push({
              label: "Opens",
              value: t.startDateTbd
                ? "TBD"
                : formatCohortDate(t.startDate, { month: "short", day: "numeric" }, "en-US"),
            });
          }

          return (
            <div
              key={t.slug}
              className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-paper-tint-soft sm:gap-6 sm:px-5 sm:py-[18px]"
            >
              {/* Whole left region → Manage (the primary action). */}
              <Link
                href={`/dashboard/admin?tab=${t.slug}`}
                className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6"
              >
                {/* Every row used to carry the same icon, so nothing was
                   scannable. A course code is. */}
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-tint font-display text-[10.5px] font-extrabold text-ink-soft transition-colors group-hover:bg-paper-tint-soft"
                >
                  {trackCode(t)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-ink">
                    {t.name}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {t.instructor}
                    {awaitingCertificates && (
                      <span className="ml-2 font-medium text-primary">
                        · Ended — no certificates issued yet
                      </span>
                    )}
                  </p>
                </div>

                <div className="hidden shrink-0 items-center gap-8 lg:flex xl:gap-10">
                  {metrics.map((m) => (
                    <div key={m.label} className="flex w-[124px] flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
                        {m.label}
                      </span>
                      <span className="text-[13px] tabular-nums text-ink">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>

                <LinkPending className="ml-0" />
              </Link>

              {/* One named action beats two mystery icons. The arrow was
                 decorative and the eye needed a tooltip to explain
                 itself; this says where it goes. */}
              <Link
                href={`/dashboard/track/${t.slug}`}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-ink-faint transition-colors hover:bg-paper-tint hover:text-ink"
              >
                <Eye size={14} aria-hidden className="inline align-[-2px] sm:hidden" />
                <span className="hidden sm:inline">Student view</span>
                <span className="sr-only">Open student view of {t.name}</span>
                <LinkPending className="ml-1.5 align-[-2px]" />
              </Link>
            </div>
          );
        };

        return (
          <div className="space-y-8">
            <HomeBand
              eyebrow={formatCohortDate(
                easternDayKey(now),
                { weekday: "long", month: "long", day: "numeric" },
                "en-US",
              )}
              headline={bandHeadline}
              sub={bandSub}
              rail={bandRail}
              stats={[
                { value: String(running.length), label: "Running" },
                { value: String(activeTotal), label: "Active" },
                ...(needsYou.length > 0
                  ? [{ value: String(needsYou.length), label: "Need you", urgent: true }]
                  : []),
              ]}
            >
              {/* Naming a problem without offering the fix is half a
                 feature: every one of these goes straight to the course
                 whose roster is empty. One gets a whole clickable row;
                 several get a row of links, because "3 courses" with no
                 way through means opening the list and hunting anyway. */}
              {needsYou.length === 1 && (
                <Link
                  href={`/dashboard/admin?tab=${needsYou[0].slug}`}
                  className="group relative -mx-2 flex flex-wrap items-center gap-2.5 rounded-lg border-t border-white/[0.14] px-2 pb-1 pt-3 transition-colors hover:bg-white/[0.06]"
                >
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[color:var(--signal)]" />
                  <LinkPending tone="inverse" className="ml-0 order-last" />
                  <p className="text-[13px] text-white/[0.86]">
                    <span className="font-semibold text-white">
                      {liveTrackNames[needsYou[0].slug]?.name ?? needsYou[0].name}
                    </span>{" "}
                    opens soon and has nobody enrolled.
                  </p>
                  <span className="text-[12.5px] text-white/60 transition-colors group-hover:text-white">
                    Open the course
                  </span>
                  <ArrowRight
                    size={14}
                    weight="bold"
                    aria-hidden
                    className="text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </Link>
              )}

              {needsYou.length > 1 && (
                <div className="relative flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-white/[0.14] pt-3">
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[color:var(--signal)]" />
                  <p className="text-[13px] text-white/[0.86]">
                    {needsYou.length} courses open soon with nobody enrolled:
                  </p>
                  {needsYou.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/dashboard/admin?tab=${t.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.24] px-2.5 py-1 text-[12.5px] font-medium text-white transition-colors hover:bg-white/[0.1]"
                    >
                      {liveTrackNames[t.slug]?.name ?? t.name}
                      <ArrowRight size={12} weight="bold" aria-hidden />
                      <LinkPending tone="inverse" className="ml-0" />
                    </Link>
                  ))}
                </div>
              )}
            </HomeBand>

            {running.length > 0 && (
              <Section label="Running now" count={running.length}>
                <div className="divide-y divide-rule overflow-hidden panel">
                  {running.map(renderRow)}
                </div>
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section label="Starting soon" count={upcoming.length}>
                <div className="divide-y divide-rule overflow-hidden panel">
                  {upcoming.map(renderRow)}
                </div>
              </Section>
            )}
            {completed.length > 0 && (
              <Section label="Completed" count={completed.length}>
                <div className="divide-y divide-rule overflow-hidden panel">
                  {completed.map(renderRow)}
                </div>
              </Section>
            )}
          </div>
        );
      })()}

    </div>
  );
      
}
