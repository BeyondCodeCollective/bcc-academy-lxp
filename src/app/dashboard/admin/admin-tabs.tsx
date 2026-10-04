"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { deleteStudentAction, updateStudentAction, saveSessionContent, assignStudentTrack, removeStudentTrack, bulkAssignTrack, assignInstructorTrack, removeInstructorTrack } from "./actions";
import type { SessionResource, StudentTrackRow, InstructorTrackRow } from "./actions";
import { canManageStudents, canSwitchPrograms, canViewInsights } from "@/lib/roles";
import { UserCheck, ClipboardText as ClipboardList, Coffee } from "@phosphor-icons/react";
import { buttonClass, type SaveState } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import type { CourseSidebar } from "@/lib/course-needs";
import { type CourseEngagementProps } from "@/components/stats/course-engagement";
import type { EngagementAnalytics } from "./actions-analytics";
import type { CoursesAnalytics } from "./actions-courses";
import { TrackOverviewForm } from "./track-overview-form";
import type { PendingPerson } from "@/lib/people-hub";
import type { InsightsData } from "./page";
import type { Student } from "@/lib/types";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { type CohortRow, type StudentRow, type AdminTrackConfig, type AdminSession, type AdminWeek, type SessionContentMap, buildInitialWeeks, applyContentMap, getTrackIcon, type StudentSubView } from "./admin-shared";
import { AdminTopTabs } from "./admin-top-tabs";
import { StudentWorkTab } from "./student-work-tab";
import { PeopleTab } from "./people-tab";
import { HomeTab } from "./home-tab";
import { TrackView } from "./track-view";
import { AttendanceOverviewTab } from "./attendance-overview-tab";
import { LunchLearnTab } from "./lunch-learn-tab";
import { AnalyticsTab } from "./analytics-tab";
import { CourseProgressTab } from "./course-progress-tab";
import { InsightsTab } from "./insights-tab";

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminTabs({
  cohorts,
  students: initialStudents,
  tracks,
  studentTracks: initialStudentTracks,
  instructorTracks: initialInstructorTracks = [],
  programSlug: initialProgramSlug,
  surveyConfigs,
  trackPublicSurveys = [],
  userRole = "admin",
  isMaster = false,
  assignableRoles = [],
  engagementScores = {},
  courseStats = {},
  initialTab,
  initialTrackView,
  initialStudentSubView,
  lunchLearnRecordings = [],
  insightsData = null,
  switchablePrograms = [],
  hiddenCourseCount = 0,
  analyticsData = null,
  analyticsCourse,
  coursesData = null,
  courseEngagement = null,
  attendanceRates = null,
  trackAnsweredSurveyIds = null,
  trackEnrolledCount = 0,
  trackSurveyRespondents = {},
  pendingPeople = [],
  alumniEnrollments = [],
  unviewedAssessments = 0,
  launchReadiness = {},
  courseNeeds = {},
  trackExams = [],
}: {
  cohorts: CohortRow[];
  students: StudentRow[];
  tracks: AdminTrackConfig[];
  studentTracks: StudentTrackRow[];
  instructorTracks?: InstructorTrackRow[];
  programSlug: string;
  surveyConfigs: {
    id: string;
    title: string;
    skipForTracks?: string[];
    appliesToTracks?: string[];
    appliesToPrograms?: string[];
  }[];
  trackPublicSurveys?: { id: string; title: string; count: number }[];
  userRole?: string;
  isMaster?: boolean;
  assignableRoles?: string[];
  engagementScores?: Record<string, { total: number; attendance: number; submissions: number; reflections: number; videos: number }>;
  /** Server-computed enrolled/active/completed per track. See getCourseRosterStats. */
  courseStats?: Record<
    string,
    { total: number; active: number; fullAttendance: number | null; sessionsHeld: number; certificates?: number }
  >;
  initialTab?: string;
  initialTrackView?: string;
  /** Which Students sub-view to open (roster / attendance / progress / work /
   *  certificates), so a linked-to number lands on the list behind it. */
  initialStudentSubView?: string;
  lunchLearnRecordings?:{ id: string; title: string; presenter: string; recording_url: string; description: string | null; recorded_at: string }[];
  insightsData?: InsightsData | null;
  analyticsData?: EngagementAnalytics | null;
  /** Shared Analytics course scope (?course=), applied to the funnel + table. */
  analyticsCourse?: string;
  coursesData?: CoursesAnalytics | null;
  courseEngagement?: CourseEngagementProps | null;
  /** Per-learner attendance for the open course — roster badge. */
  attendanceRates?: { held: number; attended: Record<string, number> } | null;
  /** Programs a super-admin can switch into, for the no-program empty state. */
  switchablePrograms?: { slug: string; name: string }[];
  /** Courses the CURRENT program owns that are hidden. Non-zero means the
   *  empty state is a hide/show state, not a program with no courses. */
  hiddenCourseCount?: number;
  /** Survey Insights narrowed to the open course's roster; null off the course Surveys view. */
  /** Auth surveys with ≥1 response from the open course's students; null off track tabs. */
  trackAnsweredSurveyIds?: string[] | null;
  /** Enrolled learners in the open course — response-rate denominator. */
  trackEnrolledCount?: number;
  /** survey id → distinct learners from this course who answered it. */
  trackSurveyRespondents?: Record<string, number>;
  pendingPeople?: PendingPerson[];
  alumniEnrollments?: { track_slug: string; email: string; source: string }[];
  unviewedAssessments?: number;
  /** Pre-launch checks per track, present only for courses near their start
   *  date. See lib/launch-readiness. */
  launchReadiness?: Record<string, { label: string; ok: boolean; detail: string; action?: "send-invites" }[]>;
  courseNeeds?: Record<string, CourseSidebar>;
  /** The open course's practice exams, rendered as rows in the Surveys list. */
  trackExams?: { id: string; title: string; attempted: number }[];
}) {
  const router = useRouter();
  const programSlug = initialProgramSlug;
  // Capability-driven, so it follows ROLE_CAPABILITIES: admin and super_admin
  // both manage people (the ladder is cumulative), plus the master owner.
  const isManager = canManageStudents(userRole) || isMaster;
  // Courses for the shared Analytics scope selector (slug + display name).
    // Programs like Catalyst (apex) don't have a learner dashboard — no
  // tracks, no cohorts. They render a single empty-state pointer to
  // Survey Insights via the `insights` tab.
  const isDashboardless = tracks.length === 0 && cohorts.length === 0;
  // Nothing visible, but the program does own courses — they're just hidden.
  const allCoursesHidden = isDashboardless && hiddenCourseCount > 0;
  // Build tab list dynamically. The old "Program" Overview tab is gone —
  // it duplicated /dashboard/insights for super-admins and was a wasted
  // landing for managers. Admins now land directly on People (or first
  // track for instructors).
  const tabs = isDashboardless
    ? []
    : [
        ...tracks.map((t, i) => ({ id: t.slug, label: t.shortName, icon: getTrackIcon(i) })),
        // Cross-course rollups are a manager tool; an instructor's course tab
        // already holds its own Students / Attendance / Progress / Work views.
        ...(isManager
          ? [
              { id: "student-work", label: "Student Work", icon: ClipboardList },
              { id: "attendance", label: "Analytics", icon: UserCheck },
              { id: "lunch-learn", label: "Lunch & Learn", icon: Coffee },
            ]
          : []),
      ];

  // Default landing is the Admin Home picker — a grid of cards that lets
  // the admin choose what to manage. People + Student Work + Attendance +
  // Lunch & Learn are still reachable from the picker's secondary links
  // (or via direct URL), they're just not the default surface anymore.
  // Instructors with assigned tracks still land on the picker so the URL
  // pattern stays consistent — they'll see only the tracks they teach.
  const defaultTab = "home";

  // A ?tab= that matches neither a fixed tab nor one of THIS program's tracks
  // (stale bookmark, back-button into another program's course, hidden course)
  // must not render a dead blank view — fall back to the home picker.
  const FIXED_TABS = new Set([
    "home", "students", "student-work", "attendance", "insights",
    "analytics", "course-progress", "lunch-learn",
  ]);
  const normalizeTab = (t: string) =>
    FIXED_TABS.has(t) || tracks.some((tr) => tr.slug === t) ? t : defaultTab;

  const [tab, setTab] = useState<string>(normalizeTab(initialTab || defaultTab));
  const [liveTrackNames, setLiveTrackNames] = useState<Record<string, { name: string; instructor: string }>>({});

  // When the browser restores this page from its back-forward cache (bfcache),
  // the JS heap is frozen in time and router.refresh() on another page doesn't
  // help. Detect restoration via pageshow and force a fresh fetch.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    // Next's client router restores back/forward from its own cache without
    // re-fetching — stale when the program cookie changed in between (switch
    // program, hit back). The URL is identical across programs, so only a
    // refresh can reconcile the view with the current cookie.
    const handlePopState = () => router.refresh();
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync tab state when the URL ?tab= param changes (sidebar nav clicks).
  // Critical: when the URL switches BACK to /dashboard/admin with no ?tab=
  // (e.g. clicking the Admin sidebar item after viewing Insights), the
  // component used to keep its previous tab state — which rendered the
  // old view with empty server data and looked like a load failure. Now
  // we reset to the default tab whenever initialTab is absent.
  useEffect(() => {
    const next = normalizeTab(initialTab || defaultTab);
    if (next !== tab) setTab(next);
  }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const [students, setStudents] = useState(initialStudents);
  // Client-side nav between tabs (e.g. Engagement -> Attendance) re-runs the
  // server load with a different roster, but useState keeps its FIRST value —
  // so landing on a tab that doesn't fetch students (Engagement/Survey insights)
  // and then opening Attendance showed "0 students". Adopt the server roster
  // whenever its membership changes; identical rosters are left alone so
  // optimistic in-tab edits (add/remove/rename) aren't clobbered by ref churn.
  useEffect(() => {
    setStudents((prev) => {
      if (
        prev.length === initialStudents.length &&
        prev.every((s, i) => s.id === initialStudents[i]?.id)
      ) {
        return prev;
      }
      return initialStudents;
    });
  }, [initialStudents]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  // Launch-readiness accordion — collapsed by default so the checks never push
  // the course view down; the badge in the header still shows red/green.
  const [readinessOpen, setReadinessOpen] = useState(false);
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
  const [studentSaving, setStudentSaving] = useState<string | null>(null);

  // Track data: keyed by track slug
  const [trackData, setTrackData] = useState<Record<string, AdminWeek[]>>(() => {
    const initial: Record<string, AdminWeek[]> = {};
    for (const t of tracks) {
      initial[t.slug] = buildInitialWeeks(t);
    }
    return initial;
  });

  // Per-track, per-week save state
  const [saveStates, setSaveStates] = useState<Record<string, Record<number, SaveState>>>({});
  const saveTimers = useRef<Record<string, Record<number, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    const timers = saveTimers;
    return () => {
      for (const trackTimers of Object.values(timers.current)) {
        Object.values(trackTimers).forEach(clearTimeout);
      }
    };
  }, []);


  // Track which slugs have already been loaded so router.refresh() calls
  // (triggered by TrackOverviewForm autosave) don't re-fetch and overwrite
  // text the admin is actively editing.
  const loadedSlugs = useRef<Set<string>>(new Set());

  // Load initial session content from the API for all tracks
  useEffect(() => {
    async function loadContent(track: AdminTrackConfig) {
      // Only load once per slug. router.refresh() creates a new `tracks`
      // array reference on every re-render, which would otherwise re-trigger
      // this effect and reset in-progress edits before the 800ms save fires.
      if (loadedSlugs.current.has(track.slug)) return;
      // Home/insights tabs serialize tracks with weeks: [] to slim the
      // payload. Fetching now would apply DB content onto an empty base, and
      // the loadedSlugs guard above would then block the retry when the full
      // config arrives — leaving the curriculum permanently blank. Defer
      // until the track tab's server render provides the real weeks.
      if (!track.weeks.length) return;
      loadedSlugs.current.add(track.slug);
      try {
        const res = await fetch(`/api/session-content?track=${track.slug}`);
        if (!res.ok) return;
        const json = await res.json() as { rows: Array<{
          week_number: number;
          meeting_link: string | null;
          recording_url: string | null;
          meeting_link_2: string | null;
          recording_url_2: string | null;
          meeting_link_3: string | null;
          recording_url_3: string | null;
          status: string | null;
          status_2: string | null;
          status_3: string | null;
          resources: SessionResource[];
          title: string | null;
          subtitle: string | null;
          description: string | null;
          objectives: string[] | null;
        }> };
        const map: SessionContentMap = {};
        for (const row of json.rows) {
          map[row.week_number] = {
            meeting_link: row.meeting_link ?? "",
            recording_url: row.recording_url ?? "",
            meeting_link_2: row.meeting_link_2 ?? "",
            recording_url_2: row.recording_url_2 ?? "",
            meeting_link_3: row.meeting_link_3 ?? "",
            recording_url_3: row.recording_url_3 ?? "",
            status: row.status ?? "upcoming",
            status_2: row.status_2 ?? "upcoming",
            status_3: row.status_3 ?? "upcoming",
            resources: row.resources ?? [],
            title: row.title ?? null,
            subtitle: row.subtitle ?? null,
            description: row.description ?? null,
            objectives: row.objectives ?? null,
          };
        }
        setTrackData((prev) => {
          // The home tab serializes tracks with weeks:[] to reduce payload.
          // When the user navigates to a track tab the server re-renders with
          // full week config — the tracks prop updates, this effect re-runs,
          // and prev[slug] may still be [] from the initial mount. Use the
          // current track config as the base in that case so the curriculum
          // renders correctly without requiring a manual refresh.
          const base = prev[track.slug]?.length ? prev[track.slug] : buildInitialWeeks(track);
          return { ...prev, [track.slug]: applyContentMap(base, map) };
        });
      } catch {
        // API unavailable — still rebuild weeks from config if empty so the
        // curriculum accordion shows up even without DB content.
        setTrackData((prev) => {
          if (!prev[track.slug]?.length && track.weeks.length) {
            return { ...prev, [track.slug]: buildInitialWeeks(track) };
          }
          return prev;
        });
      }
    }
    for (const t of tracks) {
      loadContent(t);
    }
  }, [tracks]);

  // ── Debounced save for any track ──────────────────────────────────────────

  const scheduleSave = useCallback((trackSlug: string, weekNum: number, weekData: AdminWeek) => {
    if (!saveTimers.current[trackSlug]) saveTimers.current[trackSlug] = {};
    clearTimeout(saveTimers.current[trackSlug][weekNum]);
    setSaveStates((s) => ({ ...s, [trackSlug]: { ...s[trackSlug], [weekNum]: "saving" } }));

    saveTimers.current[trackSlug][weekNum] = setTimeout(async () => {
      try {
        const allResources = weekData.sessions.flatMap((s) => s.resources);
        const objectivesArr = weekData.overrideObjectives.trim()
          ? weekData.overrideObjectives.split("\n").map((s) => s.trim()).filter(Boolean)
          : null;
        await saveSessionContent(trackSlug, weekNum, {
          meeting_link: weekData.sessions[0]?.meetingLink ?? "",
          recording_url: weekData.sessions[0]?.recordingUrl ?? "",
          meeting_link_2: weekData.sessions[1]?.meetingLink ?? "",
          recording_url_2: weekData.sessions[1]?.recordingUrl ?? "",
          meeting_link_3: weekData.sessions[2]?.meetingLink ?? "",
          recording_url_3: weekData.sessions[2]?.recordingUrl ?? "",
          status: weekData.sessions[0]?.status ?? "upcoming",
          status_2: weekData.sessions[1]?.status ?? "upcoming",
          status_3: weekData.sessions[2]?.status ?? "upcoming",
          title: weekData.overrideTitle || null,
          subtitle: weekData.overrideSubtitle || null,
          description: weekData.overrideDescription || null,
          objectives: objectivesArr,
          resources: allResources,
        }, programSlug);
        setSaveStates((s) => ({ ...s, [trackSlug]: { ...s[trackSlug], [weekNum]: "saved" } }));
        setTimeout(() => setSaveStates((s) => ({ ...s, [trackSlug]: { ...s[trackSlug], [weekNum]: "idle" } })), 2000);
      } catch (err) {
        console.error(`[admin] ${trackSlug} week ${weekNum} save failed:`, err);
        setSaveStates((s) => ({ ...s, [trackSlug]: { ...s[trackSlug], [weekNum]: "error" } }));
      }
    }, 800);
  }, []);

  function updateSession(trackSlug: string, weekNum: number, sessionNum: number, patch: Partial<AdminSession>) {
    setTrackData((prev) => {
      const weeks = prev[trackSlug] ?? [];
      const updated = weeks.map((w) =>
        w.week === weekNum
          ? {
              ...w,
              sessions: w.sessions.map((s) =>
                s.num === sessionNum ? { ...s, ...patch } : s
              ),
            }
          : w
      );
      const week = updated.find((w) => w.week === weekNum)!;
      scheduleSave(trackSlug, weekNum, week);
      return { ...prev, [trackSlug]: updated };
    });
  }

  function updateWeekOverride(trackSlug: string, weekNum: number, patch: Partial<Pick<AdminWeek, "overrideTitle" | "overrideSubtitle" | "overrideDescription" | "overrideObjectives">>) {
    setTrackData((prev) => {
      const weeks = prev[trackSlug] ?? [];
      const updated = weeks.map((w) =>
        w.week === weekNum ? { ...w, ...patch } : w
      );
      const week = updated.find((w) => w.week === weekNum)!;
      scheduleSave(trackSlug, weekNum, week);
      return { ...prev, [trackSlug]: updated };
    });
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState("");

  // Track enrollment state
  const [enrollments, setEnrollments] = useState<StudentTrackRow[]>(initialStudentTracks);
  // Same staleness trap as the roster above: client-nav between tabs re-runs
  // the server load, but useState keeps its FIRST value — arriving at
  // Attendance from a tab that doesn't fetch enrollments (Engagement/Surveys)
  // rendered every course as 0 students. Adopt the server rows whenever
  // membership changes; identical sets are left alone so optimistic in-tab
  // enrollment edits aren't clobbered.
  useEffect(() => {
    setEnrollments((prev) => {
      if (
        prev.length === initialStudentTracks.length &&
        prev.every(
          (e, i) =>
            e.student_id === initialStudentTracks[i]?.student_id &&
            e.track_slug === initialStudentTracks[i]?.track_slug,
        )
      ) {
        return prev;
      }
      return initialStudentTracks;
    });
  }, [initialStudentTracks]);
  const [instrTracks, setInstrTracks] = useState<InstructorTrackRow[]>(initialInstructorTracks);
  const [instrTrackSaving, setInstrTrackSaving] = useState<string | null>(null);
  const [enrollmentSaving, setEnrollmentSaving] = useState<string | null>(null);
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");
  const [bulkTrack, setBulkTrack] = useState<string>(tracks[0]?.slug ?? "");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const [showBulkAssign, setShowBulkAssign] = useState(false);

  async function updateStudent(id: string, field: "role" | "cohort_id" | "first_name" | "last_name", value: string) {
    setStudentSaving(id);
    try {
      await updateStudentAction(id, field, value);
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    } catch (e) {
      console.error("Failed to update student:", e);
    }
    setStudentSaving(null);
  }

  async function deleteStudent(id: string) {
    setStudentSaving(id);
    try {
      await deleteStudentAction(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to delete student:", e);
    }
    setStudentSaving(null);
    setConfirmDelete(null);
  }

  // Track enrollment helpers
  function getStudentEnrollments(studentId: string): string[] {
    return enrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => e.track_slug);
  }

  async function toggleTrackEnrollment(studentId: string, trackSlug: string) {
    setEnrollmentSaving(`${studentId}-${trackSlug}`);
    try {
      const isEnrolled = enrollments.some(
        (e) => e.student_id === studentId && e.track_slug === trackSlug
      );
      if (isEnrolled) {
        await removeStudentTrack(studentId, trackSlug, programSlug);
        setEnrollments((prev) =>
          prev.filter((e) => !(e.student_id === studentId && e.track_slug === trackSlug))
        );
      } else {
        await assignStudentTrack(studentId, trackSlug, programSlug);
        setEnrollments((prev) => [
          ...prev,
          { id: crypto.randomUUID(), student_id: studentId, track_slug: trackSlug, program_id: "", created_at: new Date().toISOString() },
        ]);
      }
    } catch (e) {
      console.error("Failed to toggle enrollment:", e);
    }
    setEnrollmentSaving(null);
  }

  async function handleBulkAssign() {
    if (bulkSelected.size === 0 || !bulkTrack) return;
    setBulkSaving(true);
    try {
      await bulkAssignTrack(Array.from(bulkSelected), bulkTrack, programSlug);
      // Add to local state
      const newRows: StudentTrackRow[] = Array.from(bulkSelected)
        .filter((sid) => !enrollments.some((e) => e.student_id === sid && e.track_slug === bulkTrack))
        .map((sid) => ({
          id: crypto.randomUUID(),
          student_id: sid,
          track_slug: bulkTrack,
          program_id: "",
          created_at: new Date().toISOString(),
        }));
      setEnrollments((prev) => [...prev, ...newRows]);
      setBulkSelected(new Set());
    } catch (e) {
      console.error("Failed to bulk assign:", e);
    }
    setBulkSaving(false);
  }

  // Instructor track helpers
  function getInstructorAssignments(instructorId: string): string[] {
    return instrTracks
      .filter((e) => e.student_id === instructorId)
      .map((e) => e.track_slug);
  }

  async function toggleInstructorTrack(instructorId: string, trackSlug: string) {
    setInstrTrackSaving(`${instructorId}-${trackSlug}`);
    try {
      const isAssigned = instrTracks.some(
        (e) => e.student_id === instructorId && e.track_slug === trackSlug
      );
      if (isAssigned) {
        await removeInstructorTrack(instructorId, trackSlug, programSlug);
        setInstrTracks((prev) =>
          prev.filter((e) => !(e.student_id === instructorId && e.track_slug === trackSlug))
        );
      } else {
        await assignInstructorTrack(instructorId, trackSlug, programSlug);
        setInstrTracks((prev) => [
          ...prev,
          { id: crypto.randomUUID(), student_id: instructorId, track_slug: trackSlug, program_id: "", created_at: new Date().toISOString() },
        ]);
      }
    } catch (e) {
      console.error("Failed to toggle instructor track:", e);
    }
    setInstrTrackSaving(null);
  }

  // ── Find the currently selected track config ────────────────────────────
  const activeTrack = tracks.find((t) => t.slug === tab);
  const activeWeeks = trackData[tab] ?? [];

  // Students enrolled in the active track (for track-scoped views).
  const trackStudentIds = activeTrack
    ? new Set(enrollments.filter((e) => e.track_slug === activeTrack.slug).map((e) => e.student_id))
    : null;
  const trackStudents = trackStudentIds
    ? students.filter((s) => trackStudentIds.has(s.id))
    : students;

  return (
    <div>
      <div className="flex flex-col">
      <div className="min-w-0 flex-1">

      {/* Dashboardless programs (marketing apex with no tracks) have nothing
         per-track to show. Surface the next useful destinations instead. */}
      {isDashboardless && (
        <div className="space-y-4">
          {/* Two different empty states wear the same shape. A program with no
             courses at all (the marketing apex) needs the program picker. A
             program whose courses are ALL hidden needs Manage Courses — it
             used to get the picker, which switched back into the same program,
             which was still empty, so there was no way out of the loop and no
             Manage button on the screen that replaced the real admin home. */}
          <PageHeader
            eyebrow="Admin"
            title={allCoursesHidden ? "Every course here is hidden" : "No program selected"}
            subtitle={
              allCoursesHidden
                ? `This program has ${hiddenCourseCount} ${hiddenCourseCount === 1 ? "course" : "courses"}, all currently hidden, so there's nothing to manage on this screen. Show one in Manage Courses to bring the admin home back.`
                : canSwitchPrograms(userRole)
                  ? "This domain has no courses of its own. Open Manage Courses, or switch programs from your avatar menu."
                  : "This domain doesn't have a learner dashboard. Contact a super-admin to switch programs."
            }
          />
          {/* Two buttons for super-admins, whose avatar menu already switches
             programs (pills removed 2026-08-20 at Fonz's request). A
             cross-program grant holder (Jihan) has NO other switcher, so for
             them the granted programs render here — it's the only way out of
             an all-hidden home program (2026-08-24). */}
          {canManageStudents(userRole) && (
            <div className="flex flex-wrap gap-2">
              <a href="/dashboard/admin/programs" className={buttonClass("dark", "md")}>
                Manage Courses
                <span aria-hidden>&rarr;</span>
              </a>
              <a href="/dashboard/admin/programs/new" className={buttonClass("secondary", "md")}>
                New course
              </a>
            </div>
          )}
          {!canSwitchPrograms(userRole) && switchablePrograms.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-ink-soft">Your other programs</p>
              <div className="flex flex-wrap gap-2">
                {switchablePrograms.map((p) => (
                  <a
                    key={p.slug}
                    href={`/api/switch-program?slug=${encodeURIComponent(p.slug)}&next=${encodeURIComponent("/dashboard/admin")}`}
                    className={buttonClass("secondary", "md")}
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Home — the picker grid. Default landing when no ?tab= is set.
         Replaces the old crowded People-tab-as-default. Click a card to go
         into that track's per-track admin; quiet secondary links below
         cover cross-track operations (People, Student Work, Attendance,
         Lunch & Learn). */}
      {tab === "home" && !isDashboardless && (
        <HomeTab
          courseStats={courseStats}
          enrollments={enrollments}
          isManager={isManager}
          isMaster={isMaster}
          liveTrackNames={liveTrackNames}
          programSlug={programSlug}
          students={students}
          tracks={tracks}
          userRole={userRole}
        />
      )}

      {/* Track view — shows when a track is selected from the sidebar */}
      {activeTrack && (
        <TrackView
          activeTrack={activeTrack}
          activeWeeks={activeWeeks}
          assignableRoles={assignableRoles}
          attendanceRates={attendanceRates}
          cohorts={cohorts}
          courseEngagement={courseEngagement}
          courseNeeds={courseNeeds}
          deleteStudent={deleteStudent}
          engagementScores={engagementScores}
          enrollmentSaving={enrollmentSaving}
          enrollments={enrollments}
          expandedWeek={expandedWeek}
          instrTrackSaving={instrTrackSaving}
          instrTracks={instrTracks}
          isManager={isManager}
          launchReadiness={launchReadiness}
          liveTrackNames={liveTrackNames}
          programSlug={programSlug}
          readinessOpen={readinessOpen}
          readinessResult={readinessResult}
          readinessSending={readinessSending}
          router={router}
          saveStates={saveStates}
          setExpandedWeek={setExpandedWeek}
          setLiveTrackNames={setLiveTrackNames}
          setReadinessOpen={setReadinessOpen}
          setReadinessResult={setReadinessResult}
          setReadinessSending={setReadinessSending}
          setStudentSubView={setStudentSubView}
          setStudents={setStudents}
          setTrackView={setTrackView}
          studentSaving={studentSaving}
          studentSubView={studentSubView}
          students={students}
          surveyConfigs={surveyConfigs}
          toggleInstructorTrack={toggleInstructorTrack}
          toggleTrackEnrollment={toggleTrackEnrollment}
          trackAnsweredSurveyIds={trackAnsweredSurveyIds}
          trackEnrolledCount={trackEnrolledCount}
          trackExams={trackExams}
          trackPublicSurveys={trackPublicSurveys}
          trackStudents={trackStudents}
          trackSurveyRespondents={trackSurveyRespondents}
          trackView={trackView}
          tracks={tracks}
          updateSession={updateSession}
          updateStudent={updateStudent}
          updateWeekOverride={updateWeekOverride}
          userRole={userRole}
        />
      )}

      {/* People — compact cross-track roster */}
      {tab === "students" && (
        <div className="space-y-6">
        <AdminTopTabs current="students" showInsights={canViewInsights(userRole)} isManager={isManager} />
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
          pendingPeople={pendingPeople}
        />
        </div>
      )}

      {/* Standalone Student Work (from sidebar, all tracks) */}
      {tab === "student-work" && (
        <div className="space-y-6">
          <AdminTopTabs current="student-work" showInsights={canViewInsights(userRole)} isManager={isManager} />
          <StudentWorkTab tracks={tracks} programSlug={programSlug} />
        </div>
      )}

      {/* Standalone Analytics (from sidebar, all tracks) */}
      {tab === "attendance" && (
        <AttendanceOverviewTab
          enrollments={enrollments}
          isManager={isManager}
          students={students}
          tracks={tracks}
          userRole={userRole}
        />
      )}

      {/* Lunch & Learn management */}
      {tab === "lunch-learn" && <LunchLearnTab lunchLearnRecordings={lunchLearnRecordings} />}

      {/* Engagement Analytics — program-level activation funnel + per-learner
         activity. Scoped to the current program (the action enforces it), so it
         follows the program switcher rather than showing every program. */}
      {tab === "analytics" && (
        <AnalyticsTab
          analyticsCourse={analyticsCourse}
          analyticsData={analyticsData}
          isManager={isManager}
          userRole={userRole}
        />
      )}

      {/* Courses & Progress — completion funnel, distribution, and per-course /
         per-student progress. Scoped to the current program like Engagement. */}
      {tab === "course-progress" && (
        <CourseProgressTab
          coursesData={coursesData}
          isManager={isManager}
          userRole={userRole}
        />
      )}

      {/* Survey Insights — per-program survey management + cross-program
         response viewer. The Overview tab used to host the Pre/Post survey
         cards too; they were noisy there and properly belong here next to
         the response data. The bare /dashboard/insights route hosts the
         broader operational dashboard (engagement, attendance, alumni). */}
      {tab === "insights" && (
        <InsightsTab
          insightsData={insightsData}
          isManager={isManager}
          userRole={userRole}
        />
      )}
      </div>
      </div>
    </div>
  );
}
// Re-export the helper so student-facing pages can use it without importing
// from this file (avoids "use client" leaking into server components).
export { isStorageUrl, isUploadedVideo };
