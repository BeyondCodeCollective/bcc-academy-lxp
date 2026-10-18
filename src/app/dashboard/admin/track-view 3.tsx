"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { StudentTrackRow, InstructorTrackRow } from "./actions";
import { canSwitchPrograms } from "@/lib/roles";
import { isLearner } from "@/lib/analytics/engagement";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CaretDown as ChevronDown, ArrowSquareOut as ExternalLink, UploadSimple as Video } from "@phosphor-icons/react";
import { BackLink, buttonClass, fieldInput, SaveIndicator, SegmentedTabs, type SaveState } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import type { CourseSidebar } from "@/lib/course-needs";
import { computeCurrentWeek, trackHasStarted, formatCohortDate } from "@/lib/utils";
import { AttendanceTab } from "./attendance-tab";
import { ProgressTab } from "./progress-tab";
import { CertificatesPanel } from "./certificates-panel";
import { TrackInsightsSection } from "@/components/track-insights-section";
import { CourseEngagement, type CourseEngagementProps } from "@/components/stats/course-engagement";
import { TrackOverviewForm } from "./track-overview-form";
import { OfficeHoursEditor } from "./office-hours-editor";
import { sendCohortInvites } from "./invites/actions";
import { isStorageUrl } from "@/lib/storage-utils";
import type { SetStateAction } from "react";
import { type CohortRow, type StudentRow, type AdminTrackConfig, type AdminSession, type AdminWeek, type StudentSubView } from "./admin-shared";
import { UploadButton, VIDEO_ACCEPT, ResourceEditor } from "./resource-editor";
import { StudentWorkTab } from "./student-work-tab";
import { PeopleTab } from "./people-tab";

type TrackViewProps = {
  activeTrack: AdminTrackConfig;
  activeWeeks: AdminWeek[];
  assignableRoles: string[];
  initialStudentSubView?: string;
  initialTab?: string;
  initialTrackView?: string;
  attendanceRates: { held: number; attended: Record<string, number>; } | null;
  cohorts: CohortRow[];
  courseEngagement: CourseEngagementProps | null;
  courseNeeds: { [x: string]: CourseSidebar; };
  deleteStudent: (id: string) => Promise<void>;
  engagementScores: { [x: string]: { total: number; attendance: number; submissions: number; reflections: number; videos: number; }; };
  enrollmentSaving: string | null;
  enrollments: StudentTrackRow[];
  instrTrackSaving: string | null;
  instrTracks: InstructorTrackRow[];
  isManager: boolean;
  launchReadiness: { [x: string]: { label: string; ok: boolean; detail: string; action?: "send-invites"; }[]; };
  liveTrackNames: { [x: string]: { name: string; instructor: string; }; };
  programSlug: string;
  router: ReturnType<typeof useRouter>;
  saveStates: { [x: string]: Record<number, SaveState>; };
  setLiveTrackNames: (value: SetStateAction<Record<string, { name: string; instructor: string; }>>) => void;
  setStudents: (value: SetStateAction<StudentRow[]>) => void;
  studentSaving: string | null;
  students: StudentRow[];
  surveyConfigs: { id: string; title: string; skipForTracks?: string[]; appliesToTracks?: string[]; appliesToPrograms?: string[]; }[];
  toggleInstructorTrack: (instructorId: string, trackSlug: string) => Promise<void>;
  toggleTrackEnrollment: (studentId: string, trackSlug: string) => Promise<void>;
  trackAnsweredSurveyIds: string[] | null;
  trackEnrolledCount: number;
  trackExams: { id: string; title: string; attempted: number; }[];
  trackPublicSurveys: { id: string; title: string; count: number; }[];
  trackSurveyRespondents: { [x: string]: number; };
  tracks: AdminTrackConfig[];
  updateSession: (trackSlug: string, weekNum: number, sessionNum: number, patch: Partial<AdminSession>) => void;
  updateStudent: (id: string, field: "role" | "cohort_id" | "first_name" | "last_name", value: string) => Promise<void>;
  updateWeekOverride: (trackSlug: string, weekNum: number, patch: Partial<Pick<AdminWeek, "overrideTitle" | "overrideSubtitle" | "overrideDescription" | "overrideObjectives">>) => void;
  userRole: string;
};

export function TrackView({
  activeTrack,
  activeWeeks,
  assignableRoles,
  initialStudentSubView,
  initialTab,
  initialTrackView,
  attendanceRates,
  cohorts,
  courseEngagement,
  courseNeeds,
  deleteStudent,
  engagementScores,
  enrollmentSaving,
  enrollments,
  instrTrackSaving,
  instrTracks,
  isManager,
  launchReadiness,
  liveTrackNames,
  programSlug,
  router,
  saveStates,
  setLiveTrackNames,
  setStudents,
  studentSaving,
  students,
  surveyConfigs,
  toggleInstructorTrack,
  toggleTrackEnrollment,
  trackAnsweredSurveyIds,
  trackEnrolledCount,
  trackExams,
  trackPublicSurveys,
  trackSurveyRespondents,
  tracks,
  updateSession,
  updateStudent,
  updateWeekOverride,
  userRole,
}: TrackViewProps) {
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    // Launch-readiness accordion — collapsed by default so the checks never push
    // the course view down; the badge in the header still shows red/green.
    const [readinessOpen, setReadinessOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [readinessSending, setReadinessSending] = useState(false);
    const [readinessResult, setReadinessResult] = useState<string | null>(null);
    const [trackView, setTrackView] = useState<
      "overview" | "analytics" | "curriculum" | "students" | "surveys"
    >((initialTrackView as "overview" | "analytics" | "curriculum" | "students" | "surveys") ?? "overview");
    // Landing on a course must honor the URL's view (or default to Overview) —
    // trackView is client state, so without this, switching courses reopened
    // whatever sub-tab was last visited (e.g. Surveys) on the NEW course.
    useEffect(() => {
      setTrackView(
        (initialTrackView as "overview" | "analytics" | "curriculum" | "students" | "surveys") ??
          "overview",
      );
    }, [initialTab, initialTrackView]); // eslint-disable-line react-hooks/exhaustive-deps
    const SUB_VIEWS: StudentSubView[] = ["students", "attendance", "progress", "work", "certificates"];
    const subViewFromUrl = SUB_VIEWS.includes(initialStudentSubView as StudentSubView)
      ? (initialStudentSubView as StudentSubView)
      : null;
    const [studentSubView, setStudentSubView] = useState<StudentSubView>(subViewFromUrl ?? "students");
    // Same reason trackView re-syncs: switching courses must not carry the last
    // course's sub-view over, and a link that names one must win.
    useEffect(() => {
      setStudentSubView(subViewFromUrl ?? "students");
    }, [initialTab, initialStudentSubView]); // eslint-disable-line react-hooks/exhaustive-deps

    // Students enrolled in the active track (for track-scoped views).
    const trackStudentIds = new Set(
      enrollments.filter((e) => e.track_slug === activeTrack.slug).map((e) => e.student_id),
    );
    const trackStudents = students.filter((s) => trackStudentIds.has(s.id));

    // Count only role=student enrollments. The raw student_tracks rows
    // include instructors/admins assigned to the track, which would
    // inflate the header and diverge from the People sub-tab's count.
    const studentRoleIds = new Set(
      students.filter(isLearner).map((s) => s.id),
    );
    const enrolledInTrack = enrollments.filter(
      (e) => e.track_slug === activeTrack.slug && studentRoleIds.has(e.student_id),
    ).length;
    const notStarted = !trackHasStarted(activeTrack);
    const currentWeek = notStarted
      ? 0
      : activeTrack.currentUnit ??
        computeCurrentWeek(
          activeTrack.startDate,
          activeTrack.totalWeeks,
          activeTrack.lastSessionDayOffset,
        );
    const startLabel = activeTrack.startDateTbd
      ? "TBD"
      : formatCohortDate(activeTrack.startDate, { month: "short", day: "numeric" }, "en-US");
    const sidebar = courseNeeds[activeTrack.slug] ?? { needs: [], next: null };
    const hasStatus = sidebar.needs.length > 0 || sidebar.next !== null;
    return (
    <div className="space-y-4">
      {/* Back to Admin home */}
      <BackLink href="/dashboard/admin" label="Admin" />

      {/* Track header */}
      <PageHeader
        title={liveTrackNames[activeTrack.slug]?.name ?? activeTrack.name}
        subtitle={`with ${liveTrackNames[activeTrack.slug]?.instructor ?? activeTrack.instructor} · ${activeTrack.sessionTimes.join(" & ")}`}
      />

      {/* Status line: what needs an admin, and what's next. One quiet line,
         closed by default; opens in place for the detail. */}
      {hasStatus && (
        <div className="panel overflow-hidden">
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            aria-expanded={statusOpen}
            className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper-tint-soft ${statusOpen ? "border-b border-rule-soft" : ""}`}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              {sidebar.needs.length > 0 && (
                <span className="flex items-center gap-2 font-medium text-amber-800">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  {sidebar.needs.length} needs you
                </span>
              )}
              {sidebar.needs.length > 0 && sidebar.next && (
                <span aria-hidden className="hidden text-ink-faint sm:inline">·</span>
              )}
              {sidebar.next && (
                <span className="min-w-0 max-w-full truncate text-ink-soft">
                  Next: <span className="text-ink">{sidebar.next.title}</span>, {sidebar.next.when} ({sidebar.next.away})
                </span>
              )}
            </span>
            <ChevronDown
              size={14}
              aria-hidden
              className={`shrink-0 text-ink-faint transition-transform ${statusOpen ? "rotate-180" : ""}`}
            />
          </button>
          {statusOpen && (
            <div className="divide-y divide-rule-soft">
              {sidebar.needs.map((n) => (
                <div key={n.label} className="flex items-start gap-3 px-4 py-2.5">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{n.label}</p>
                    <p className="text-micro text-ink-faint">{n.detail}</p>
                  </div>
                </div>
              ))}
              {sidebar.next && (
                <div className="px-4 py-2.5">
                  <p className="text-sm text-ink">
                    {sidebar.next.hasZoom ? "Zoom link set" : "No Zoom link yet"}
                    {sidebar.next.autoRecord === "cloud" && " · auto-record on"}
                  </p>
                  <p className="text-micro text-ink-faint">For the next session</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Launch readiness — only rendered near a start date. Live checks
         so launch-morning triage is a refresh, not hand-run queries. */}
      {launchReadiness[activeTrack.slug] && (() => {
        const checks = launchReadiness[activeTrack.slug];
        const redCount = checks.filter((c) => !c.ok).length;
        return (
          <div className="panel overflow-hidden">
            <button
              type="button"
              onClick={() => setReadinessOpen((v) => !v)}
              aria-expanded={readinessOpen}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-paper-tint-soft ${readinessOpen ? "border-b border-rule-soft" : ""}`}
            >
              <p className="text-micro font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Launch readiness · starts {formatCohortDate(activeTrack.startDate, { month: "short", day: "numeric" }, "en-US")}
              </p>
              <span className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-micro font-medium ${
                    redCount === 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {redCount === 0 ? "All clear" : `${redCount} need${redCount === 1 ? "s" : ""} attention`}
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={`text-ink-faint transition-transform ${readinessOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {readinessOpen && (
              <div className="divide-y divide-rule-soft">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-start gap-3 px-4 py-2.5">
                    <span
                      aria-hidden
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{c.label}</p>
                      <p className="text-micro text-ink-faint">{c.detail}</p>
                      {c.action === "send-invites" && readinessResult && (
                        <p className="mt-1 text-micro text-ink-soft">{readinessResult}</p>
                      )}
                    </div>
                    {/* Fix it where it's flagged — same idempotent cohort
                       send the People tab uses (skips already-invited). */}
                    {c.action === "send-invites" && canSwitchPrograms(userRole) && (
                      <button
                        type="button"
                        disabled={readinessSending}
                        onClick={async () => {
                          const name = liveTrackNames[activeTrack.slug]?.name ?? activeTrack.name;
                          if (
                            !window.confirm(
                              `Send invites for ${name} to everyone on the allowlist who hasn't been invited yet?`,
                            )
                          )
                            return;
                          setReadinessSending(true);
                          setReadinessResult(null);
                          const r = await sendCohortInvites(activeTrack.slug);
                          setReadinessSending(false);
                          setReadinessResult(
                            r.ok
                              ? `${r.sent ?? 0} sent${r.failed ? `, ${r.failed} failed` : ""}${r.remaining ? ` · ${r.remaining} remaining — click again to continue` : ""}`
                              : r.error ?? "Failed to send invites.",
                          );
                          router.refresh();
                        }}
                        className={buttonClass("secondary", "sm")}
                      >
                        {readinessSending ? "Sending…" : "Send invites"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Sub-tab bar within the track — the one segmented control */}
      <SegmentedTabs
        ariaLabel="Course view"
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "analytics", label: "Analytics" },
          { id: "curriculum", label: "Curriculum" },
          { id: "students", label: "Students" },
          { id: "surveys", label: "Surveys" },
        ]}
        active={trackView}
        onSelect={(id) =>
          setTrackView(id as "overview" | "analytics" | "curriculum" | "students" | "surveys")
        }
      />

      {/* Sub-tab content */}
      {trackView === "overview" && (
        <div className="space-y-8">
          <TrackOverviewForm
            key={activeTrack.slug}
            track={activeTrack}
            programSlug={programSlug}
            onLiveChange={(patch) =>
              setLiveTrackNames((prev) => ({ ...prev, [activeTrack.slug]: patch }))
            }
          />
          <OfficeHoursEditor
            key={`oh-${activeTrack.slug}`}
            trackSlug={activeTrack.slug}
            programSlug={programSlug}
            initial={activeTrack.officeHours ?? []}
          />
        </div>
      )}

      {/* Analytics — this one course's numbers, in one place. The
         CourseEngagement snapshot is engagement/attendance-framed (active
         this week, turnout, status), never a misleading "0% complete". */}
      {trackView === "analytics" && (
        <div className="space-y-8">
          {courseEngagement ? (
            <CourseEngagement {...courseEngagement} />
          ) : (
            <p className="text-sm text-ink-faint">
              No analytics for this course yet — this fills in once learners
              start attending and doing the work.
            </p>
          )}
        </div>
      )}

      {trackView === "curriculum" && (
      <div className="space-y-3">
      {activeWeeks.map((aw) => {
        const hasMultipleSessions = aw.sessions.length > 1;
        return (
          <div key={aw.week} className="panel-form overflow-hidden">
            <button
              onClick={() => setExpandedWeek(expandedWeek === aw.week ? null : aw.week)}
              className="flex w-full items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-paper-tint-soft transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule text-micro font-semibold tabular-nums text-ink-soft">
                  {aw.week}
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-ink">
                    {aw.overrideTitle || aw.title}
                  </p>
                  <p className="text-micro text-ink-faint">
                    {aw.sessions.length} session{aw.sessions.length !== 1 ? "s" : ""}
                    {aw.sessions.some((s) => s.recordingUrl) && " · Recording set"}
                    {aw.sessions.some((s) => s.resources.length > 0) && " · Has resources"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SaveIndicator state={saveStates[activeTrack.slug]?.[aw.week] ?? "idle"} />
                <span className={`h-2 w-2 rounded-full ${aw.sessions.every((s) => s.status === "completed") ? "bg-success" : "bg-neutral-300"}`} />
                <ChevronDown size={16} className={`text-ink-faint transition-transform ${expandedWeek === aw.week ? "rotate-180" : ""}`} />
              </div>
            </button>

            {expandedWeek === aw.week && (
              <div className="border-t border-rule-soft">
                {/* Content overrides */}
                <div className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3 border-b border-rule-soft">
                  <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
                    Session Content
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-ink-soft">Title</label>
                      <input
                        type="text"
                        value={aw.overrideTitle}
                        onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideTitle: e.target.value })}
                        placeholder={aw.title}
                        className={`${fieldInput} mt-1`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-soft">Subtitle</label>
                      <input
                        type="text"
                        value={aw.overrideSubtitle}
                        onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideSubtitle: e.target.value })}
                        placeholder="e.g. Industry Perspectives"
                        className={`${fieldInput} mt-1`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-soft">Description</label>
                    <div className="mt-1">
                      <RichTextEditor
                        content={aw.overrideDescription}
                        onChange={(html) => updateWeekOverride(activeTrack.slug, aw.week, { overrideDescription: html })}
                        placeholder="Leave blank to use the default description"
                        minHeight={120}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-soft">
                      What You&apos;ll Cover <span className="font-normal text-ink-faint">(one per line)</span>
                    </label>
                    <textarea
                      value={aw.overrideObjectives}
                      onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideObjectives: e.target.value })}
                      placeholder="Leave blank to use defaults"
                      rows={4}
                      className={`${fieldInput} mt-1 resize-none`}
                    />
                  </div>
                </div>

                {/* Sessions */}
                <div className={hasMultipleSessions ? "divide-y divide-neutral-100" : ""}>
                {aw.sessions.map((s) => (
                  <div key={s.num} className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">
                    {hasMultipleSessions && (
                      <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
                        Session {s.num}: {s.title}
                      </p>
                    )}

                    {/* Meeting link */}
                    <div>
                      <label className="text-xs font-medium text-ink-soft">Meeting Link</label>
                      <input
                        type="url"
                        value={s.meetingLink}
                        onChange={(e) => updateSession(activeTrack.slug, aw.week, s.num, { meetingLink: e.target.value })}
                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                        className={`${fieldInput} mt-1`}
                      />
                    </div>

                    {/* Recording — URL paste + file upload */}
                    <div>
                      <label className="text-xs font-medium text-ink-soft">Recording</label>
                      <div className="mt-1 flex gap-2 items-start">
                        <input
                          type="url"
                          value={s.recordingUrl}
                          onChange={(e) => updateSession(activeTrack.slug, aw.week, s.num, { recordingUrl: e.target.value })}
                          placeholder="https://youtube.com/... or https://drive.google.com/..."
                          className={`${fieldInput} flex-1`}
                        />
                        <UploadButton accept={VIDEO_ACCEPT} label="Upload Recording" icon={Video}
                          track={activeTrack.slug}
                          week={aw.week}
                          onUploaded={({ url }) => updateSession(activeTrack.slug, aw.week, s.num, { recordingUrl: url })}
                        />
                      </div>
                      {s.recordingUrl && isStorageUrl(s.recordingUrl) && (
                        <p className="mt-1 text-micro text-ink-faint">
                          Uploaded file · <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-soft">Preview</a>
                        </p>
                      )}
                    </div>

                    {/* Resources */}
                    <div className="border border-rule-soft bg-neutral-50 p-3">
                      <ResourceEditor
                        resources={s.resources}
                        track={activeTrack.slug}
                        week={aw.week}
                        onChange={(updated) => updateSession(activeTrack.slug, aw.week, s.num, { resources: updated })}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.status === "completed"}
                          onChange={(e) => updateSession(activeTrack.slug, aw.week, s.num, { status: e.target.checked ? "completed" : "upcoming" })}
                          className="h-4 w-4 rounded border-rule accent-neutral-900"
                        />
                        <span className="text-sm text-ink">Mark as completed</span>
                      </label>
                      {s.meetingLink && (
                        <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
                          Open link <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}

      {/* Students tab — peer views you switch between (never stacked, so the
         people list isn't duplicated). Cohort courses get Attendance (live
         sessions); self-paced courses get Progress instead (watched +
         uploaded), since there's no class to attend. */}
      {trackView === "students" && (() => {
        // Attendance only for cohort courses; Progress only for self-paced.
        // Never leave the view stuck on an option that's hidden for this track.
        const showAttendance = !activeTrack.selfPaced;
        const showProgress = !!activeTrack.selfPaced;
        const subView =
          (studentSubView === "attendance" && !showAttendance) ||
          (studentSubView === "progress" && !showProgress)
            ? "students"
            : studentSubView;
        const viewSwitcher = (
          <div className="relative">
            <select
              value={subView}
              onChange={(e) =>
                setStudentSubView(
                  e.target.value as "students" | "attendance" | "progress" | "work" | "certificates",
                )
              }
              className="appearance-none panel pl-3 pr-8 py-2 text-sm font-medium text-ink focus:border-ink-faint"
            >
              <option value="students">Roster</option>
              {showAttendance && <option value="attendance">Attendance</option>}
              {showProgress && <option value="progress">Progress</option>}
              <option value="work">Submissions</option>
              <option value="certificates">Certificates</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        );
        return (
          <div className="space-y-4">
            {subView === "students" && (
              <PeopleTab
                students={students}
                cohorts={cohorts}
                tracks={tracks}
                enrollments={enrollments}
                instrTracks={instrTracks}
                engagementScores={engagementScores}
                isManager={isManager}
                assignableRoles={assignableRoles}
                programSlug={programSlug}
                enrollmentSaving={enrollmentSaving}
                instrTrackSaving={instrTrackSaving}
                studentSaving={studentSaving}
                onUpdateStudent={updateStudent}
                onDeleteStudent={deleteStudent}
                onToggleStudentTrack={toggleTrackEnrollment}
                onToggleInstructorTrack={toggleInstructorTrack}
                onStudentAdded={(s) => setStudents((prev) => [...prev, s])}
                initialTrackFilter={activeTrack.slug}
                attendanceRates={attendanceRates}
                embedded
                viewSwitcher={viewSwitcher}
              />
            )}

            {subView === "attendance" && (
              <AttendanceTab
                students={trackStudents.filter(isLearner)}
                tracks={[activeTrack]}
                scopeLabel={activeTrack.shortName}
                embedded
                viewSwitcher={viewSwitcher}
              />
            )}

            {subView === "progress" && (
              <ProgressTab
                students={trackStudents.filter(isLearner)}
                trackSlug={activeTrack.slug}
                totalWeeks={activeTrack.totalWeeks}
                viewSwitcher={viewSwitcher}
              />
            )}

            {subView === "work" && (
              <StudentWorkTab
                tracks={[activeTrack]}
                programSlug={programSlug}
                viewSwitcher={viewSwitcher}
              />
            )}

            {subView === "certificates" && (
              <CertificatesPanel
                students={trackStudents.filter(isLearner)}
                trackSlug={activeTrack.slug}
                programSlug={programSlug}
                viewSwitcher={viewSwitcher}
              />
            )}
          </div>
        );
      })()}

      {/* Surveys sub-view — scoped to this track. ONE surface: the index
         of this course's forms and exams with response rates. Summaries
         and answer-level data live one level down, in each form's report —
         the embedded program-insights panel duplicated this list through
         its Form dropdown and only rendered on a full-page load, so the
         tab showed different content depending on how you arrived. */}
      {trackView === "surveys" && (
        <div className="space-y-8">
          <TrackInsightsSection
            trackSlug={activeTrack.slug}
            trackShortName={activeTrack.shortName}
            programSlug={programSlug}
            // Only surveys this track's students actually take. A track
            // opted out via skipForTracks (Security+ vs the AI
            // Fundamentals surveys) shouldn't list them; a companion
            // (MASS) follows the course it wraps around.
            // Evidence-based, not opt-out: list only surveys this course's
            // students have actually answered (plus the skip rule). The old
            // opt-out-only filter surfaced every program survey under every
            // course. Exception: a survey ASSIGNED to this course
            // (appliesToTracks) always lists — at "0 of N" until people
            // respond — otherwise a survey you're actively driving is
            // invisible right when you need to watch it fill in (the HFS
            // impact survey sat at zero with no row at all, 2026-08-17).
            surveyConfigs={surveyConfigs.filter((s) => {
              const home = activeTrack.companionOf ?? activeTrack.slug;
              if (s.skipForTracks?.includes(home)) return false;
              // A survey assigned to specific courses lists ONLY under
              // those courses. Assignment beats evidence: cross-enrolled
              // learners' answers otherwise surface another course's
              // survey here (HFS "How Did We Do?" under MASS, 2026-08-27).
              // A survey may name its courses, its programs, or both. Both
              // union (see surveyTargetsLearner): the AI Fundamentals
              // pre-survey belongs to Beyond Code Centers AND to Catalyst
              // Labs, so it must list under every course on either side.
              if (s.appliesToTracks?.length || s.appliesToPrograms?.length) {
                return (
                  (s.appliesToTracks ?? []).some(
                    (t) => t === activeTrack.slug || t === home,
                  ) || (s.appliesToPrograms ?? []).includes(programSlug)
                );
              }
              return (
                trackAnsweredSurveyIds === null ||
                trackAnsweredSurveyIds.includes(s.id)
              );
            })}
            trackPublicSurveys={trackPublicSurveys}
            enrolledCount={trackEnrolledCount}
            respondentsBySurvey={trackSurveyRespondents}
            exams={trackExams}
          />
        </div>
      )}
    </div>
    );
      
}
