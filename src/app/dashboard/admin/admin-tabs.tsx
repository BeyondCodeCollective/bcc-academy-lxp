"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteStudentAction, updateStudentAction, updateCohortAction, saveSessionContent, assignStudentTrack, removeStudentTrack, bulkAssignTrack, exportSurveyResponses, exportPublicSurveyResponses, getAllSubmissions, addFeedback, assignInstructorTrack, removeInstructorTrack, deleteSurveyResponse, deletePublicSurveyResponse, listPublicSurveyResponses, sendInviteAction, createCohortAction } from "./actions";
import type { SessionResource, StudentTrackRow, SurveyStatsRow, AdminSubmissionRow, InstructorTrackRow, PublicSurveyStatsRow } from "./actions";
import { canManageStudents, canSwitchPrograms, canViewInsights } from "@/lib/roles";
import {
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  Save,
  ChevronDown,
  ExternalLink,
  Check,
  UserCheck,
  Trash2,
  UserPlus,
  Plus,
  X,
  Link as LinkIcon,
  Upload,
  Download,
  Loader2,
  Video,
  FileText,
  ClipboardList,
  Send,
  MessageSquare,
  Coffee,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { buttonClass, fieldInput } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { computeCurrentWeek } from "@/lib/utils";
import { LunchLearnAdmin } from "@/app/dashboard/lunch-learn/admin/admin-client";
import { AttendanceTab } from "./attendance-tab";
import { ProgressTab } from "./progress-tab";
import { TrackInsightsSection } from "@/components/track-insights-section";
import { CourseEngagement, type CourseEngagementProps } from "@/components/stats/course-engagement";
import { InsightsDashboard } from "./insights/insights-dashboard";
import { AnalyticsDashboard } from "./analytics-dashboard";
import type { EngagementAnalytics } from "./actions-analytics";
import { TrackOverviewForm } from "./track-overview-form";
import { OfficeHoursEditor } from "./office-hours-editor";
import { ManageMenu } from "./manage-menu";
import { PendingPeopleSection, StatusPill } from "./pending-people";
import type { PendingPerson } from "@/lib/people-hub";
import { AddPeoplePanel } from "./add-people-panel";
import type { OfficeHour } from "@/lib/programs/types";
import type { InsightsData } from "./page";
import type { Student } from "@/lib/types";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { iconForTrack, toneForTrack } from "@/lib/track-visual";
import { Clipboard as ClipboardListIcon, Users as UsersIcon, ChartBar as ChartBarIcon, ChartPie as ChartPieIcon, ChartLineUp as ChartLineUpIcon, ArrowLeft as ArrowLeftIcon } from "@phosphor-icons/react";

const PLATFORM_SURVEY_TITLES: Record<string, string> = {
  "bcc-learner-intake": "BCC Learner Intake",
  "bcc-workshop": "Workshop Survey",
};

type CohortRow = {
  id: string;
  name: string;
  display_name: string | null;
  track_slug: string | null;
  start_date: string | null;
  total_weeks: number | null;
};

function trackLabel(slug: string | null): string {
  if (!slug) return "";
  const map: Record<string, string> = {
    mass: "MASS",
    techplus: "CompTIA Tech+",
    "comptia-tech-plus": "CompTIA Tech+",
    "network-plus": "Network+",
    "security-plus": "Security+",
    "ai-fundamentals": "AI Fundamentals",
    "ai-automation": "AI Automation",
    "game-dev": "Game Dev",
    "ai-for-digital-natives": "AI for Digital Natives",
  };
  return map[slug] ?? slug;
}

type StudentRow = Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id" | "last_seen_at" | "last_activity_at">;

// Track config passed from server (subset of TrackConfig)
type AdminTrackConfig = {
  slug: string;
  name: string;
  shortName: string;
  description?: string;
  type?: string;
  totalWeeks: number;
  selfPaced?: boolean;
  sessionsPerWeek: number;
  instructor: string;
  sessionTimes: string[];
  startDate: string;
  startDateTbd?: boolean;
  lastSessionDayOffset: number;
  weekSummaries: { week: number; topic: string; icon: string }[];
  defaultReflectionPrompts?: string[];
  submissionsEnabled?: boolean;
  reflectionsEnabled?: boolean;
  sequentialGating?: boolean;
  officeHours?: OfficeHour[];
  weeks: {
    week: number;
    title: string;
    icon: string;
    sessions: { title: string }[];
    submissionPrompts?: string[];
  }[];
};

// Unified per-session state for admin editing
type AdminSession = {
  num: number;
  title: string;
  meetingLink: string;
  recordingUrl: string;
  resources: SessionResource[];
  status: "upcoming" | "completed";
};

// Unified per-week state
type AdminWeek = {
  week: number;
  title: string;
  icon: string;
  sessions: AdminSession[];
  /** Instructor overrides (empty string = use config default) */
  overrideTitle: string;
  overrideSubtitle: string;
  overrideDescription: string;
  overrideObjectives: string; // newline-separated for editing
};

// DB content map
type SessionContentMap = Record<number, {
  meeting_link: string;
  recording_url: string;
  meeting_link_2: string;
  recording_url_2: string;
  meeting_link_3: string;
  recording_url_3: string;
  status: string;
  status_2: string;
  status_3: string;
  resources: SessionResource[];
  title: string | null;
  subtitle: string | null;
  description: string | null;
  objectives: string[] | null;
}>;

function buildInitialWeeks(track: AdminTrackConfig): AdminWeek[] {
  return track.weeks.map((w) => ({
    week: w.week,
    title: w.title,
    icon: w.icon,
    overrideTitle: "",
    overrideSubtitle: "",
    overrideDescription: "",
    overrideObjectives: "",
    sessions: w.sessions.map((s, i) => ({
      num: i + 1,
      title: s.title,
      meetingLink: "",
      recordingUrl: "",
      resources: [],
      status: "upcoming" as const,
    })),
  }));
}

function applyContentMap(weeks: AdminWeek[], map: SessionContentMap): AdminWeek[] {
  return weeks.map((w) => {
    const content = map[w.week];
    if (!content) return w;
    return {
      ...w,
      overrideTitle: content.title ?? "",
      overrideSubtitle: content.subtitle ?? "",
      overrideDescription: content.description ?? "",
      overrideObjectives: content.objectives?.join("\n") ?? "",
      sessions: w.sessions.map((s, i) => ({
        ...s,
        meetingLink: i === 0 ? content.meeting_link : i === 1 ? content.meeting_link_2 : i === 2 ? content.meeting_link_3 : s.meetingLink,
        recordingUrl: i === 0 ? content.recording_url : i === 1 ? content.recording_url_2 : i === 2 ? content.recording_url_3 : s.recordingUrl,
        status: (i === 0 ? content.status : i === 1 ? content.status_2 : i === 2 ? content.status_3 : s.status) as "upcoming" | "completed",
        resources: i === 0 ? content.resources : s.resources,
      })),
    };
  });
}

// "Tasha Morris" → "Tasha M." for board-demo screens where full names
// shouldn't appear. Falls back to whatever's available if the name is a
// single token or empty.
function anonymizeName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Anonymous";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

// ─── Upload Button (generic) ────────────────────────────────────────────────

type UploadState = "idle" | "uploading" | "error";

function UploadButton({
  track,
  week,
  accept,
  label,
  icon: Icon,
  onUploaded,
}: {
  track: string;
  week: number;
  accept: string;
  label: string;
  icon: typeof Upload;
  onUploaded: (result: { url: string; name: string }) => void;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState("uploading");
    setErrorMsg("");

    try {
      const supabase = createBrowserClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
      const storagePath = `${track}/${week}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("session-files")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/session-files/${storagePath}`;

      onUploaded({ url: publicUrl, name: file.name });
      setUploadState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploadState === "uploading"}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadState === "uploading"}
        className={`${buttonClass("secondary", "sm")} min-h-[36px]`}
      >
        {uploadState === "uploading" ? (
          <><Loader2 size={11} className="animate-spin" /> Uploading...</>
        ) : (
          <><Icon size={11} /> {label}</>
        )}
      </button>
      {uploadState === "error" && (
        <p className="text-[10px] text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}

const FILE_ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.webm,.zip";
const VIDEO_ACCEPT = ".mp4,.mov,.webm,.avi,.mkv";

// ─── Resource Editor ──────────────────────────────────────────────────────────

function ResourceEditor({
  resources,
  track,
  week,
  onChange,
}: {
  resources: SessionResource[];
  track: string;
  week: number;
  onChange: (updated: SessionResource[]) => void;
}) {
  function addLink() {
    onChange([...resources, { name: "", url: "", type: "link" }]);
  }

  function updateResource(index: number, field: keyof SessionResource, value: string) {
    onChange(resources.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeResource(index: number) {
    onChange(resources.filter((_, i) => i !== index));
  }

  function handleFileUploaded({ url, name }: { url: string; name: string }) {
    onChange([...resources, { name, url, type: "file" as const }]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-medium text-ink-soft">Resources</label>
        <div className="flex items-center gap-1.5">
          <UploadButton accept={FILE_ACCEPT} label="Upload File" icon={Upload} track={track} week={week} onUploaded={handleFileUploaded} />
          <button
            type="button"
            onClick={addLink}
            className={`${buttonClass("secondary", "sm")} min-h-[36px]`}
          >
            <Plus size={11} />
            Add Link
          </button>
        </div>
      </div>

      {resources.length === 0 && (
        <p className="text-[11px] text-ink-faint pl-0.5">No resources yet</p>
      )}

      {resources.map((r, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="mt-2 shrink-0">
            {r.type === "file" || isStorageUrl(r.url) ? (
              <FileText size={12} className="text-ink-faint" />
            ) : (
              <LinkIcon size={12} className="text-ink-faint" />
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={r.name}
              onChange={(e) => updateResource(i, "name", e.target.value)}
              placeholder="Display name"
              className={fieldInput}
            />
            {r.type === "file" || isStorageUrl(r.url) ? (
              <div className="border border-rule-soft bg-muted-bg px-3 py-2 text-xs text-ink-faint truncate">
                {r.url.split("/").pop() ?? r.url}
              </div>
            ) : (
              <input
                type="url"
                value={r.url}
                onChange={(e) => updateResource(i, "url", e.target.value)}
                placeholder="https://..."
                className={fieldInput}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => removeResource(i)}
            className="mt-2 text-ink-faint hover:text-red-400 transition-colors shrink-0"
            title="Remove resource"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Save indicator ───────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="text-[11px] text-ink-faint">Saving...</span>;
  if (state === "saved") return (
    <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
      <Check size={11} /> Saved
    </span>
  );
  return <span className="text-[11px] text-red-500">Save failed</span>;
}

// ─── Tab icon helper ─────────────────────────────────────────────────────────

function getTrackIcon(index: number) {
  const icons = [GraduationCap, BookOpen, Video, FileText];
  return icons[index % icons.length];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminTabs({
  cohorts,
  students: initialStudents,
  tracks,
  studentTracks: initialStudentTracks,
  instructorTracks: initialInstructorTracks = [],
  programSlug: initialProgramSlug,
  surveyStats,
  surveyConfigs,
  trackPublicSurveys = [],
  userRole = "admin",
  isMaster = false,
  assignableRoles = [],
  engagementScores = {},
  initialTab,
  initialTrackView,
  lunchLearnRecordings = [],
  insightsData = null,
  analyticsData = null,
  courseEngagement = null,
  pendingPeople = [],
  alumniEnrollments = [],
  unviewedAssessments = 0,
}: {
  cohorts: CohortRow[];
  students: StudentRow[];
  tracks: AdminTrackConfig[];
  studentTracks: StudentTrackRow[];
  instructorTracks?: InstructorTrackRow[];
  programSlug: string;
  surveyStats: Record<string, SurveyStatsRow[]>;
  surveyConfigs: { id: string; title: string }[];
  trackPublicSurveys?: { id: string; title: string; count: number }[];
  userRole?: string;
  isMaster?: boolean;
  assignableRoles?: string[];
  engagementScores?: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }>;
  initialTab?: string;
  initialTrackView?: string;
  lunchLearnRecordings?:{ id: string; title: string; presenter: string; recording_url: string; description: string | null; recorded_at: string }[];
  insightsData?: InsightsData | null;
  analyticsData?: EngagementAnalytics | null;
  courseEngagement?: CourseEngagementProps | null;
  pendingPeople?: PendingPerson[];
  alumniEnrollments?: { track_slug: string; email: string; source: string }[];
  unviewedAssessments?: number;
}) {
  const router = useRouter();
  const programSlug = initialProgramSlug;
  // super_admin is view-only; people management is for program admins + master.
  const isManager = canManageStudents(userRole) || isMaster;
  // Programs like Catalyst (apex) don't have a learner dashboard — no
  // tracks, no cohorts. They render a single empty-state pointer to
  // Survey Insights via the `insights` tab.
  const isDashboardless = tracks.length === 0 && cohorts.length === 0;
  // Build tab list dynamically. The old "Program" Overview tab is gone —
  // it duplicated /dashboard/insights for super-admins and was a wasted
  // landing for managers. Admins now land directly on People (or first
  // track for instructors).
  const tabs = isDashboardless
    ? []
    : [
        ...tracks.map((t, i) => ({ id: t.slug, label: t.shortName, icon: getTrackIcon(i) })),
        { id: "student-work", label: "Student Work", icon: ClipboardList },
        { id: "attendance", label: "Analytics", icon: UserCheck },
        ...(isManager ? [{ id: "lunch-learn", label: "Lunch & Learn", icon: Coffee }] : []),
      ];

  // Default landing is the Admin Home picker — a grid of cards that lets
  // the admin choose what to manage. People + Student Work + Attendance +
  // Lunch & Learn are still reachable from the picker's secondary links
  // (or via direct URL), they're just not the default surface anymore.
  // Instructors with assigned tracks still land on the picker so the URL
  // pattern stays consistent — they'll see only the tracks they teach.
  const defaultTab = "home";

  const [tab, setTab] = useState<string>(initialTab || defaultTab);
  const [liveTrackNames, setLiveTrackNames] = useState<Record<string, { name: string; instructor: string }>>({});

  // When the browser restores this page from its back-forward cache (bfcache),
  // the JS heap is frozen in time and router.refresh() on another page doesn't
  // help. Detect restoration via pageshow and force a fresh fetch.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync tab state when the URL ?tab= param changes (sidebar nav clicks).
  // Critical: when the URL switches BACK to /dashboard/admin with no ?tab=
  // (e.g. clicking the Admin sidebar item after viewing Insights), the
  // component used to keep its previous tab state — which rendered the
  // old view with empty server data and looked like a load failure. Now
  // we reset to the default tab whenever initialTab is absent.
  useEffect(() => {
    const next = initialTab || defaultTab;
    if (next !== tab) setTab(next);
  }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const [students, setStudents] = useState(initialStudents);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [trackView, setTrackView] = useState<
    "overview" | "curriculum" | "students" | "surveys"
  >((initialTrackView as "overview" | "curriculum" | "students" | "surveys") ?? "overview");
  const [studentSubView, setStudentSubView] = useState<"students" | "attendance" | "progress" | "work">("students");
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
  const [instrTracks, setInstrTracks] = useState<InstructorTrackRow[]>(initialInstructorTracks);
  const [instrTrackSaving, setInstrTrackSaving] = useState<string | null>(null);
  const [enrollmentSaving, setEnrollmentSaving] = useState<string | null>(null);
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");
  const [bulkTrack, setBulkTrack] = useState<string>(tracks[0]?.slug ?? "");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const [showBulkAssign, setShowBulkAssign] = useState(false);

  async function updateStudent(id: string, field: "role" | "cohort_id", value: string) {
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
          <PageHeader
            eyebrow="Admin"
            title="No program selected"
            subtitle={
              canSwitchPrograms(userRole)
                ? "This domain doesn't have a learner dashboard. Pick a program from the sidebar to manage its tracks, or open Analytics for cross-program data."
                : "This domain doesn't have a learner dashboard. Contact a super-admin to switch programs."
            }
          />
          {canSwitchPrograms(userRole) && (
            <a
              href="/dashboard/insights"
              className={buttonClass("dark", "md")}
            >
              View Analytics
              <span aria-hidden>&rarr;</span>
            </a>
          )}
        </div>
      )}

      {/* Admin Home — the picker grid. Default landing when no ?tab= is set.
         Replaces the old crowded People-tab-as-default. Click a card to go
         into that track's per-track admin; quiet secondary links below
         cover cross-track operations (People, Student Work, Attendance,
         Lunch & Learn). */}
      {tab === "home" && !isDashboardless && (() => {
        const studentRoleIds = new Set(
          students.filter((s) => s.role === "student").map((s) => s.id),
        );
        const studentCountFor = (slug: string) =>
          enrollments.filter(
            (e) => e.track_slug === slug && studentRoleIds.has(e.student_id),
          ).length;
        const now = new Date();
        // Cross-course triage: "N active this week" per course, from the
        // last_activity_at already loaded (no extra queries). Only worth the
        // extra number on a multi-course home — a 1–2 course picker keeps the
        // plain enrolled count.
        const showActive = tracks.length >= 3;
        const weekAgo = now.getTime() - 7 * 86_400_000;
        const activeStudentIds = new Set(
          students
            .filter(
              (s) =>
                s.role === "student" &&
                s.last_activity_at &&
                new Date(s.last_activity_at).getTime() >= weekAgo,
            )
            .map((s) => s.id),
        );
        const activeCountFor = (slug: string) =>
          enrollments.filter(
            (e) => e.track_slug === slug && activeStudentIds.has(e.student_id),
          ).length;

        return (
          <div className="space-y-8">
            <PageHeader
              title="Admin"
              subtitle="Pick a course to manage — curriculum, roster, student work, and attendance."
              actions={
                canSwitchPrograms(userRole) && <ManageMenu />
              }
            />

            {/* Quick-access tabs — underline style scales better than a row of
                pills as more sections are added. */}
            <div className="flex flex-wrap items-center gap-x-1 border-b border-rule">
              {[
                { href: "/dashboard/admin?tab=students", label: "All people", Icon: UsersIcon, show: true },
                { href: "/dashboard/admin?tab=student-work", label: "Student work", Icon: ClipboardListIcon, show: true },
                { href: "/dashboard/admin?tab=attendance", label: "Attendance", Icon: ChartBarIcon, show: true },
                { href: "/dashboard/admin?tab=insights", label: "Survey insights", Icon: ChartPieIcon, show: canViewInsights(userRole) },
                { href: "/dashboard/admin?tab=analytics", label: "Engagement", Icon: ChartLineUpIcon, show: canViewInsights(userRole) },
              ]
                .filter((t) => t.show)
                .map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
                  >
                    <Icon size={14} weight="bold" aria-hidden />
                    {label}
                  </Link>
                ))}
            </div>

            <div className="divide-y divide-rule overflow-hidden panel">
              {tracks.map((t) => {
                const tone = toneForTrack(t.slug);
                const start = new Date(t.startDate);
                const started = now >= start;
                const currentWeek = started
                  ? computeCurrentWeek(
                      t.startDate,
                      t.totalWeeks,
                      t.lastSessionDayOffset,
                    )
                  : 0;
                const status =
                  t.type === "single-event"
                    ? "Single session"
                    : t.startDateTbd
                      ? "Starts TBD"
                      : t.selfPaced
                        ? `Self-paced · ${t.totalWeeks} weeks`
                        : started
                          ? `Week ${currentWeek} of ${t.totalWeeks}`
                          : `Starts ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                const count = studentCountFor(t.slug);
                return (
                  <div
                    key={t.slug}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-paper-tint-soft"
                  >
                    {/* Whole left region → Manage (the primary action). */}
                    <Link
                      href={`/dashboard/admin?tab=${t.slug}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tone }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-ink leading-snug">
                          {t.shortName || t.name}
                        </p>
                        <p className="text-[12px] text-ink-faint">
                          {t.instructor}
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-[12px] text-ink-soft sm:block">{status}</p>
                      {showActive ? (
                        <p className="shrink-0 w-24 text-right text-[12px] tabular-nums">
                          <span className="font-semibold text-primary">{activeCountFor(t.slug)}</span>
                          <span className="text-ink-faint"> / {count} active</span>
                        </p>
                      ) : (
                        <p className="shrink-0 w-20 text-right text-[12px] text-ink-faint tabular-nums">
                          {count} {count === 1 ? "student" : "students"}
                        </p>
                      )}
                    </Link>
                    {/* Second action: open the student-facing course view. */}
                    <Link
                      href={`/dashboard/track/${t.slug}`}
                      title="Open student view"
                      aria-label={`Open student view of ${t.shortName || t.name}`}
                      className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-paper-tint hover:text-ink"
                    >
                      <Eye size={15} aria-hidden />
                    </Link>
                    {/* Primary action: manage. */}
                    <Link
                      href={`/dashboard/admin?tab=${t.slug}`}
                      aria-label={`Manage ${t.shortName || t.name}`}
                      className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-paper-tint hover:text-ink group-hover:text-ink-soft"
                    >
                      <ArrowRight size={15} aria-hidden />
                    </Link>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })()}

      {/* Track view — shows when a track is selected from the sidebar */}
      {activeTrack && (() => {
        // Count only role=student enrollments. The raw student_tracks rows
        // include instructors/admins assigned to the track, which would
        // inflate the header and diverge from the People sub-tab's count.
        const studentRoleIds = new Set(
          students.filter((s) => s.role === "student").map((s) => s.id),
        );
        const enrolledInTrack = enrollments.filter(
          (e) => e.track_slug === activeTrack.slug && studentRoleIds.has(e.student_id),
        ).length;
        const notStarted = new Date(activeTrack.startDate).getTime() > Date.now();
        const currentWeek = notStarted
          ? 0
          : computeCurrentWeek(
              activeTrack.startDate,
              activeTrack.totalWeeks,
              activeTrack.lastSessionDayOffset,
            );
        const startLabel = activeTrack.startDateTbd
          ? "TBD"
          : new Date(activeTrack.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
        return (
        <div className="space-y-4">
          {/* Back to Admin home */}
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>

          {/* Track header */}
          <PageHeader
            title={liveTrackNames[activeTrack.slug]?.name ?? activeTrack.name}
            subtitle={`with ${liveTrackNames[activeTrack.slug]?.instructor ?? activeTrack.instructor} · ${activeTrack.sessionTimes.join(" & ")}`}
          />

          {/* Sub-tab bar within the track */}
          <div className="flex gap-1 bg-paper-tint p-1">
            {[
              { id: "overview" as const, label: "Overview" },
              { id: "curriculum" as const, label: "Curriculum" },
              { id: "students" as const, label: "Students" },
              { id: "surveys" as const, label: "Surveys" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setTrackView(v.id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  trackView === v.id
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink-soft"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          {trackView === "overview" && (
            <div className="space-y-8">
              {courseEngagement && <CourseEngagement {...courseEngagement} />}
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

          {trackView === "curriculum" && (
          <div className="space-y-3">
          {activeWeeks.map((aw) => {
            const hasMultipleSessions = aw.sessions.length > 1;
            return (
              <div key={aw.week} className="panel overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(expandedWeek === aw.week ? null : aw.week)}
                  className="flex w-full items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-paper-tint-soft transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule text-[11px] font-semibold tabular-nums text-ink-soft">
                      {aw.week}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-ink">
                        {aw.title}
                      </p>
                      <p className="text-[10px] text-ink-faint">
                        {aw.sessions.length} session{aw.sessions.length !== 1 ? "s" : ""}
                        {aw.sessions.some((s) => s.recordingUrl) && " · Recording set"}
                        {aw.sessions.some((s) => s.resources.length > 0) && " · Has resources"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveIndicator state={saveStates[activeTrack.slug]?.[aw.week] ?? "idle"} />
                    <span className={`h-2 w-2 rounded-full ${aw.sessions.every((s) => s.status === "completed") ? "bg-green-500" : "bg-neutral-300"}`} />
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
                        <textarea
                          value={aw.overrideDescription}
                          onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideDescription: e.target.value })}
                          placeholder="Leave blank to use the default description"
                          rows={2}
                          className={`${fieldInput} mt-1 resize-none`}
                        />
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
                            <p className="mt-1 text-[10px] text-ink-faint">
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
                      e.target.value as "students" | "attendance" | "progress" | "work",
                    )
                  }
                  className="appearance-none panel pl-3 pr-8 py-2 text-sm font-medium text-ink focus:border-ink-faint focus:outline-none"
                >
                  <option value="students">Roster</option>
                  {showAttendance && <option value="attendance">Attendance</option>}
                  {showProgress && <option value="progress">Progress</option>}
                  <option value="work">Submissions</option>
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
                    embedded
                    viewSwitcher={viewSwitcher}
                  />
                )}

                {subView === "attendance" && (
                  <AttendanceTab
                    students={trackStudents.filter((s) => s.role === "student")}
                    tracks={[activeTrack]}
                    scopeLabel={activeTrack.shortName}
                    embedded
                    viewSwitcher={viewSwitcher}
                  />
                )}

                {subView === "progress" && (
                  <ProgressTab
                    students={trackStudents.filter((s) => s.role === "student")}
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
              </div>
            );
          })()}

          {/* Surveys sub-view — scoped to this track */}
          {trackView === "surveys" && (
            <div className="space-y-8">
              <TrackInsightsSection
                trackSlug={activeTrack.slug}
                trackShortName={activeTrack.shortName}
                programSlug={programSlug}
                surveyConfigs={surveyConfigs}
                trackPublicSurveys={trackPublicSurveys}
              />
            </div>
          )}
        </div>
        );
      })()}

      {/* People — compact cross-track roster */}
      {tab === "students" && (
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
      )}

      {/* Standalone Student Work (from sidebar, all tracks) */}
      {tab === "student-work" && (
        <div className="space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>
          <PageHeader
            title="Student Work"
            subtitle="Review submitted work and leave feedback across all tracks"
          />
          <StudentWorkTab tracks={tracks} programSlug={programSlug} />
        </div>
      )}

      {/* Standalone Analytics (from sidebar, all tracks) */}
      {tab === "attendance" && (
        <div className="space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>
          <PageHeader
            title="Attendance"
            subtitle="Attendance and engagement across all tracks"
          />
          <AttendanceTab
            students={students.filter((s) => s.role === "student")}
            tracks={tracks}
            scopeLabel="All tracks"
          />
        </div>
      )}

      {/* Lunch & Learn management */}
      {tab === "lunch-learn" && (
        <div className="space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>
          <PageHeader
            title="Lunch & Learns"
            subtitle={`${lunchLearnRecordings.length} recording${lunchLearnRecordings.length === 1 ? "" : "s"} for internal staff`}
          />
          <LunchLearnAdmin recordings={lunchLearnRecordings} embedded />
        </div>
      )}

      {/* Engagement Analytics — program-level activation funnel + per-learner
         activity. Scoped to the current program (the action enforces it), so it
         follows the program switcher rather than showing every program. */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>
          <PageHeader
            title="Engagement"
            subtitle={
              analyticsData
                ? `${analyticsData.programName} — activation funnel & per-learner activity`
                : "Activation funnel & per-learner activity"
            }
          />
          {analyticsData ? (
            <AnalyticsDashboard data={analyticsData} />
          ) : (
            <p className="text-sm text-ink-faint">No analytics available for this program.</p>
          )}
        </div>
      )}

      {/* Survey Insights — per-program survey management + cross-program
         response viewer. The Overview tab used to host the Pre/Post survey
         cards too; they were noisy there and properly belong here next to
         the response data. The bare /dashboard/insights route hosts the
         broader operational dashboard (engagement, attendance, alumni). */}
      {tab === "insights" && (
        <div className="space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>
          <PageHeader
            title="Survey Insights"
            subtitle="Per-program survey management and cross-program responses"
          />

          {/* The "{Program} surveys" widget that used to live here pulled from
             `surveyStats` (auth-only, never populated on the Insights tab since
             needsSurveyStats is false). It always rendered "0 of 0 students
             completed" while the Survey Insights cards directly below showed
             real numbers — a confusing contradiction. The InsightsDashboard
             component below now serves as the single source for these counts. */}
          {false && surveyConfigs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                {programSlug === "catalyst" ? "Catalyst" : "Program"} surveys
              </h2>
              {surveyConfigs.map((survey) => {
                const stats = surveyStats[survey.id] ?? [];
                const completed = stats.filter((s) => s.completed_at).length;
                const totalStudents = students.filter((s) => s.role === "student").length;
                const pct = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;
                const completedStats = stats.filter((s) => s.completed_at);
                return (
                  <SurveyCard
                    key={survey.id}
                    title={survey.title}
                    completed={completed}
                    totalStudents={totalStudents}
                    pct={pct}
                    previewHref={`/dashboard/survey/${survey.id}`}
                    onExport={async () => {
                      const data = await exportSurveyResponses(programSlug, survey.id);
                      if (data.length === 0) return;
                      const allKeys = new Set<string>();
                      data.forEach((row) => { Object.keys(row.responses).forEach((k) => allKeys.add(k)); });
                      const headers = ["Name", "Email", "Completed At", ...Array.from(allKeys)];
                      const rows = data.map((row) => [
                        row.student_name, row.email, row.completed_at ?? "",
                        ...Array.from(allKeys).map((k) => {
                          const val = row.responses[k];
                          if (Array.isArray(val)) return val.join("; ");
                          if (typeof val === "object" && val !== null) return Object.entries(val).map(([s, a]) => {
                            if (typeof a === "object" && a !== null) { const r2 = a as Record<string, string>; return `${s}: before ${r2.before ?? ""} now ${r2.now ?? ""}`; }
                            return `${s}: ${String(a)}`;
                          }).join("; ");
                          return String(val ?? "");
                        }),
                      ]);
                      downloadCsv([headers, ...rows], `${survey.id}-responses.csv`);
                    }}
                    responses={completedStats.map((s) => {
                      const student = students.find((st) => st.id === s.student_id);
                      return {
                        id: s.student_id,
                        label: student ? (student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email) : s.student_id,
                        sublabel: student?.email ?? "",
                        completedAt: s.completed_at,
                      };
                    })}
                    onDelete={async (id) => {
                      await deleteSurveyResponse(id, survey.id, programSlug);
                    }}
                  />
                );
              })}
            </section>
          )}

          {insightsData ? (
            <InsightsDashboard
              sections={insightsData.sections}
              programs={insightsData.programs}
              totalResponses={insightsData.totalResponses}
            />
          ) : canViewInsights(userRole) ? (
            <div className="panel p-8 text-center space-y-2">
              <p className="text-sm font-medium text-ink">
                Analytics didn&apos;t load
              </p>
              <p className="text-sm text-ink-soft">
                Refresh the page. If it still doesn&apos;t load, the survey
                query may have failed — check the Vercel runtime logs for this
                request.
              </p>
            </div>
          ) : (
            <div className="panel p-8 text-center">
              <p className="text-sm text-ink-soft">
                Analytics are only available to admins.
              </p>
            </div>
          )}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

// ─── Student Work Tab ──────────────────────────────────────────────────────

function StudentWorkTab({
  tracks,
  programSlug,
  viewSwitcher,
}: {
  tracks: AdminTrackConfig[];
  programSlug: string;
  viewSwitcher?: React.ReactNode;
}) {
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const subs = await getAllSubmissions(programSlug, trackFilter !== "all" ? trackFilter : undefined);
        setSubmissions(subs);
      } catch (err) {
        console.error("Failed to load student work:", err);
      }
      setLoading(false);
    }
    load();
  }, [programSlug, trackFilter]);

  async function handleSendFeedback(itemId: string) {
    const text = feedbackText[itemId]?.trim();
    if (!text) return;
    setSendingFeedback(itemId);
    try {
      await addFeedback({
        submissionId: itemId,
        comment: text,
      });
      setFeedbackText((prev) => ({ ...prev, [itemId]: "" }));
      setSubmissions((prev) =>
        prev.map((s) => (s.id === itemId ? { ...s, feedback_count: s.feedback_count + 1 } : s))
      );
    } catch (err) {
      console.error("Failed to send feedback:", err);
    }
    setSendingFeedback(null);
  }

  const filteredSubmissions = submissions.filter((s) =>
    weekFilter === "all" ? true : s.week_number === weekFilter
  );

  const maxWeeks = Math.max(...tracks.map((t) => t.totalWeeks), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {viewSwitcher}
        {tracks.length > 1 && (
          <div className="relative">
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-ink focus:border-ink-faint focus:outline-none"
            >
              <option value="all">All Tracks</option>
              {tracks.map((t) => (
                <option key={t.slug} value={t.slug}>{t.shortName}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        )}

        <div className="relative">
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-ink focus:border-ink-faint focus:outline-none"
          >
            <option value="all">All Weeks</option>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
        </div>

        <span className="text-xs text-ink-faint ml-auto">
          {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-ink-faint" />
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {filteredSubmissions.length === 0 && (
            <p className="text-sm text-ink-faint py-8 text-center">No submissions yet</p>
          )}
          {filteredSubmissions.map((sub) => (
            <div key={sub.id} className="panel overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-paper-tint-soft transition-colors"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{sub.student_name}</p>
                    <p className="text-[11px] text-ink-faint">
                      {tracks.find((t) => t.slug === sub.track_slug)?.shortName ?? sub.track_slug} · Week {sub.week_number}
                      {sub.submitted_at && ` · ${new Date(sub.submitted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sub.feedback_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 rounded-full px-1.5 py-0.5">
                      <MessageSquare size={10} /> {sub.feedback_count}
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-ink-faint transition-transform ${expandedId === sub.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedId === sub.id && (() => {
                // Render answers in syllabus order, not jsonb key order
                // (Postgres jsonb doesn't preserve insertion order).
                const responses = sub.prompt_responses ?? {};
                const orderedPrompts =
                  tracks
                    .find((t) => t.slug === sub.track_slug)
                    ?.weeks?.find((w) => w.week === sub.week_number)
                    ?.submissionPrompts ?? [];
                const orderedKeys = orderedPrompts.filter((p) => p in responses);
                const extraKeys = Object.keys(responses).filter(
                  (k) => !orderedKeys.includes(k),
                );
                const promptOrder = [...orderedKeys, ...extraKeys];
                return (
                <div className="border-t border-rule-soft px-4 py-3 space-y-3">
                  {promptOrder.map((prompt) => (
                    <div key={prompt}>
                      <p className="text-[11px] font-medium text-ink-faint mb-0.5">{prompt}</p>
                      <p className="text-sm text-ink whitespace-pre-wrap">{responses[prompt]}</p>
                    </div>
                  ))}
                  {sub.description && (
                    <div>
                      <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-ink">{sub.description}</p>
                    </div>
                  )}
                  {sub.links.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide mb-1">Links</p>
                      <div className="space-y-1">
                        {sub.links.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-ink hover:text-ink">
                            <ExternalLink size={12} className="shrink-0" />
                            {link.label || link.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {sub.files.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide mb-1">Files</p>
                      <div className="space-y-1">
                        {sub.files.map((file, i) => (
                          <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-ink hover:text-ink">
                            <FileText size={12} className="shrink-0" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Feedback input */}
                  <div className="pt-2 border-t border-rule-soft">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedbackText[sub.id] ?? ""}
                        onChange={(e) => setFeedbackText((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Leave feedback..."
                        className={`${fieldInput} flex-1`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendFeedback(sub.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleSendFeedback(sub.id)}
                        disabled={!feedbackText[sub.id]?.trim() || sendingFeedback === sub.id}
                        className="inline-flex items-center gap-1 bg-ink px-3 py-2 text-xs font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
                      >
                        {sendingFeedback === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// Re-export the helper so student-facing pages can use it without importing
// from this file (avoids "use client" leaking into server components).
export { isStorageUrl, isUploadedVideo };

// ─── People Tab ───────────────────────────────────────────────────────────────

function PeopleTab({
  students,
  cohorts,
  tracks,
  enrollments,
  instrTracks,
  engagementScores,
  isManager,
  programSlug,
  enrollmentSaving,
  instrTrackSaving,
  studentSaving,
  onUpdateStudent,
  onDeleteStudent,
  onToggleStudentTrack,
  onToggleInstructorTrack,
  onStudentAdded,
  initialTrackFilter,
  embedded,
  viewSwitcher,
  pendingPeople = [],
  assignableRoles = [],
}: {
  students: StudentRow[];
  cohorts: CohortRow[];
  tracks: AdminTrackConfig[];
  enrollments: StudentTrackRow[];
  instrTracks: InstructorTrackRow[];
  engagementScores: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }>;
  isManager: boolean;
  assignableRoles?: string[];
  programSlug: string;
  enrollmentSaving: string | null;
  instrTrackSaving: string | null;
  studentSaving: string | null;
  onUpdateStudent: (id: string, field: "role" | "cohort_id", value: string) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onToggleStudentTrack: (studentId: string, trackSlug: string) => Promise<void>;
  onToggleInstructorTrack: (instructorId: string, trackSlug: string) => Promise<void>;
  onStudentAdded: (student: StudentRow) => void;
  initialTrackFilter?: string;
  embedded?: boolean;
  viewSwitcher?: React.ReactNode;
  pendingPeople?: PendingPerson[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(embedded ? "student" : "all");
  const [trackFilter, setTrackFilter] = useState(initialTrackFilter ?? "all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkTrack, setBulkTrack] = useState(tracks[0]?.slug ?? "");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  // Inline "New group" form — student row edit panel
  const [showNewGroupFormRow, setShowNewGroupFormRow] = useState<string | null>(null); // student id
  const [newGroupTrackRow, setNewGroupTrackRow] = useState("");
  const [newGroupNameRow, setNewGroupNameRow] = useState("");
  const [newGroupSavingRow, setNewGroupSavingRow] = useState(false);

  const router = useRouter();

  const filtered = students.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      `${s.first_name ?? ""} ${s.last_name ?? ""} ${s.email ?? ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    const matchesTrack =
      trackFilter === "all" ||
      enrollments.some((e) => e.student_id === s.id && e.track_slug === trackFilter);
    return matchesSearch && matchesRole && matchesTrack;
  });

  function getStudentTrackSlugs(studentId: string) {
    return enrollments.filter((e) => e.student_id === studentId).map((e) => e.track_slug);
  }
  function getInstructorTrackSlugs(instructorId: string) {
    return instrTracks.filter((e) => e.student_id === instructorId).map((e) => e.track_slug);
  }
  function getTrackCount(studentId: string) {
    return enrollments.filter((e) => e.student_id === studentId).length;
  }

  async function handleBulkAssign() {
    if (bulkSelected.size === 0 || !bulkTrack) return;
    setBulkSaving(true);
    try {
      await bulkAssignTrack(Array.from(bulkSelected), bulkTrack, programSlug);
      setBulkSelected(new Set());
      setShowBulkAssign(false);
    } catch (e) {
      console.error("Bulk assign failed:", e);
    }
    setBulkSaving(false);
  }

  const studentCount = students.filter((s) => s.role === "student").length;
  const instructorCount = students.filter((s) => s.role === "instructor").length;

  return (
    <div className="space-y-6">
      {!embedded && (
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
        >
          <ArrowLeftIcon size={11} weight="bold" aria-hidden />
          Admin
        </Link>
      )}
      {/* Header */}
      {(!embedded || isManager) && (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!embedded && <h1 className="text-3xl font-bold tracking-tight text-ink">People</h1>}
          {!embedded && (
            <p className="mt-0.5 text-sm text-ink-soft">
              {studentCount} {studentCount === 1 ? "student" : "students"} · {instructorCount} {instructorCount === 1 ? "instructor" : "instructors"}
            </p>
          )}
        </div>
        {!embedded && isManager && (
          <div className="flex flex-wrap items-center gap-2">
            {showBulkAssign ? (
              <>
                <div className="relative">
                  <select
                    value={bulkTrack}
                    onChange={(e) => setBulkTrack(e.target.value)}
                    className="appearance-none border border-rule bg-white pl-3 pr-7 py-2 text-xs font-medium text-ink focus:border-ink-faint focus:outline-none"
                  >
                    {tracks.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.shortName}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
                </div>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={bulkSelected.size === 0 || bulkSaving}
                  className={buttonClass("primary", "sm")}
                >
                  {bulkSaving ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                  Assign{bulkSelected.size > 0 ? ` (${bulkSelected.size})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBulkAssign(false); setBulkSelected(new Set()); }}
                  className={buttonClass("secondary", "sm")}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowBulkAssign(true)}
                  className={buttonClass("secondary", "sm")}
                >
                  <Users size={13} />
                  Bulk assign
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm((v) => !v)}
                  className={buttonClass("primary", "sm")}
                >
                  <UserPlus size={13} />
                  Add people
                </button>
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* Add people — one panel, two modes (invite by email / add directly). */}
      {!embedded && showAddForm && (
        <AddPeoplePanel
          tracks={tracks}
          programSlug={programSlug}
          assignableRoles={assignableRoles}
          onStudentAdded={onStudentAdded}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {viewSwitcher}
        {!embedded && (
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email…"
            className={`${fieldInput} flex-1 min-w-[200px]`}
          />
        )}
        {!embedded && (
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-2 text-sm text-ink focus:border-ink-faint focus:outline-none"
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        )}
        {!embedded && tracks.length > 0 && (
          <div className="relative">
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-2 text-sm text-ink focus:border-ink-faint focus:outline-none"
            >
              <option value="all">All tracks</option>
              {tracks.map((t) => (
                <option key={t.slug} value={t.slug}>{t.shortName}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        )}
        <span className="text-xs text-ink-faint">{filtered.length} shown</span>
      </div>

      {/* Pending — allowlisted/invited people with no account yet (front of
         the pipeline), shown above the roster so every stage is in one place. */}
      <PendingPeopleSection
        pending={pendingPeople}
        trackNames={Object.fromEntries(tracks.map((t) => [t.slug, t.shortName || t.name]))}
      />

      {/* Roster */}
      <div className="divide-y divide-neutral-100 overflow-hidden panel">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-ink-soft">No people found.</p>
        )}
        {filtered.map((s) => {
          const fullName =
            [s.first_name, s.last_name].filter(Boolean).join(" ") || "—";
          const isExpanded = expandedId === s.id;
          const trackCount = getTrackCount(s.id);
          const studentSlugs = getStudentTrackSlugs(s.id);
          const instructorSlugs = getInstructorTrackSlugs(s.id);

          return (
            <div key={s.id}>
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-paper-tint-soft cursor-pointer select-none"
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
              >
                {showBulkAssign && s.role === "student" && (
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setBulkSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 shrink-0 rounded border-rule accent-neutral-900"
                  />
                )}
                <Avatar
                  firstName={s.first_name ?? ""}
                  lastName={s.last_name ?? ""}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {fullName}
                  </p>
                  <p className="text-xs text-ink-faint truncate">{s.email}</p>
                  <p className="text-[11px] text-ink-faint truncate">
                    {s.last_activity_at
                      ? `Last active: ${new Date(s.last_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : s.last_seen_at
                      ? `Last login: ${new Date(s.last_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "Never logged in"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-ink-faint tabular-nums hidden sm:block">
                    {trackCount} {trackCount === 1 ? "track" : "tracks"}
                  </span>
                  {s.role === "student" && (
                    <StatusPill status={(s.last_activity_at ?? s.last_seen_at) ? "active" : "joined"} />
                  )}
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.role === "student"
                        ? "bg-paper-tint text-ink-soft"
                        : s.role === "instructor"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.role}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-ink-faint transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {isExpanded && (
                <div
                  className="border-t border-rule-soft bg-neutral-50 px-4 py-4 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Role + cohort */}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                        Role
                      </label>
                      <div className="relative mt-1">
                        {/* Only roles the actor may grant are shown; the select
                           is disabled for anyone they don't outrank (the server
                           enforces the same rule in updateStudentAction). */}
                        <select
                          value={s.role}
                          disabled={studentSaving === s.id || !assignableRoles.includes(s.role)}
                          onChange={(e) => onUpdateStudent(s.id, "role", e.target.value)}
                          className="appearance-none border border-rule bg-white pl-3 pr-7 py-2 text-xs font-medium text-ink focus:border-ink-faint focus:outline-none disabled:opacity-60"
                        >
                          {([
                            ["student", "Student"],
                            ["instructor", "Instructor"],
                            ["admin", "Admin"],
                            ["super_admin", "Super Admin"],
                          ] as const)
                            .filter(([value]) => assignableRoles.includes(value) || value === s.role)
                            .map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
                      </div>
                    </div>
                    {cohorts.length > 0 && s.role === "student" && (
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                          Group
                        </label>
                        <div className="relative mt-1">
                          <select
                            value={s.cohort_id ?? ""}
                            disabled={studentSaving === s.id}
                            onChange={(e) => onUpdateStudent(s.id, "cohort_id", e.target.value)}
                            className="appearance-none border border-rule bg-white pl-3 pr-7 py-2 text-xs font-medium text-ink focus:border-ink-faint focus:outline-none disabled:opacity-60"
                          >
                            <option value="">No group</option>
                            {cohorts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.track_slug ? `${trackLabel(c.track_slug)} — ` : ""}{c.display_name || c.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
                        </div>
                        {showNewGroupFormRow !== s.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              const slugs = getStudentTrackSlugs(s.id);
                              setNewGroupTrackRow(slugs.length === 1 ? slugs[0] : "");
                              setNewGroupNameRow("");
                              setShowNewGroupFormRow(s.id);
                            }}
                            className="mt-1 text-[11px] text-ink-faint hover:text-ink-soft transition-colors"
                          >
                            + New group
                          </button>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              value={newGroupTrackRow}
                              onChange={(e) => setNewGroupTrackRow(e.target.value)}
                              className="border border-rule bg-neutral-50 pl-3 pr-2 py-1.5 text-xs text-ink focus:border-ink-faint focus:outline-none"
                            >
                              <option value="">— select track —</option>
                              {tracks.map((t) => (
                                <option key={t.slug} value={t.slug}>{t.shortName || t.name}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newGroupNameRow}
                              onChange={(e) => setNewGroupNameRow(e.target.value)}
                              placeholder="e.g. Security+ · Cohort 1"
                              className="border border-rule bg-neutral-50 pl-3 py-1.5 text-xs text-ink focus:border-ink-faint focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={newGroupSavingRow || !newGroupTrackRow || !newGroupNameRow.trim()}
                              onClick={async () => {
                                setNewGroupSavingRow(true);
                                try {
                                  await createCohortAction({
                                    track_slug: newGroupTrackRow,
                                    display_name: newGroupNameRow.trim(),
                                    start_date: null,
                                    total_weeks: null,
                                  });
                                  setShowNewGroupFormRow(null);
                                  setNewGroupTrackRow("");
                                  setNewGroupNameRow("");
                                  router.refresh();
                                } finally {
                                  setNewGroupSavingRow(false);
                                }
                              }}
                              className={buttonClass("primary", "sm")}
                            >
                              {newGroupSavingRow ? "…" : "Create"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowNewGroupFormRow(null); setNewGroupTrackRow(""); setNewGroupNameRow(""); }}
                              className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Track chips — every track is rendered; the filled "✓"
                     chips are the student's current enrollments, the
                     outlined "+" chips are tracks they're not in (click to
                     add). Previously labeled "Enrolled tracks" which made
                     the "+" chips read like current memberships. */}
                  {tracks.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-baseline gap-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                          {s.role === "instructor" ? "Teaching" : "Tracks"}
                        </p>
                        <p className="text-[10px] text-ink-faint">
                          ✓ enrolled · + click to add
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tracks.map((t) => {
                          const savingKey = `${s.id}-${t.slug}`;
                          const isInstructor = s.role === "instructor";
                          const enrolled = isInstructor
                            ? instructorSlugs.includes(t.slug)
                            : studentSlugs.includes(t.slug);
                          const isSaving = isInstructor
                            ? instrTrackSaving === savingKey
                            : enrollmentSaving === savingKey;
                          return (
                            <button
                              key={t.slug}
                              type="button"
                              onClick={() =>
                                isInstructor
                                  ? onToggleInstructorTrack(s.id, t.slug)
                                  : onToggleStudentTrack(s.id, t.slug)
                              }
                              disabled={isSaving}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
                                enrolled
                                  ? "bg-ink text-white"
                                  : "border border-rule bg-white text-ink-soft hover:border-ink-faint hover:text-ink-soft"
                              }`}
                            >
                              {isSaving ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : enrolled ? (
                                <Check size={10} />
                              ) : (
                                <Plus size={10} />
                              )}
                              {t.shortName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Engagement snapshot (only if scores were fetched) */}
                  {s.role === "student" && engagementScores[s.id] && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                      <span>
                        <strong className="font-semibold text-ink">
                          {engagementScores[s.id].total}
                        </strong>
                        /100 engagement
                      </span>
                      <span className="text-ink-faint">·</span>
                      <span>{engagementScores[s.id].attendance} attended</span>
                      <span className="text-ink-faint">·</span>
                      <span>{engagementScores[s.id].submissions} submitted</span>
                      <span className="text-ink-faint">·</span>
                      <span>{engagementScores[s.id].reflections} reflected</span>
                    </div>
                  )}

                  {/* Remove person */}
                  {isManager && (
                    <div className="border-t border-rule pt-3">
                      {confirmDeleteId === s.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-soft">
                            Remove {s.first_name || s.email}?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteStudent(s.id);
                              setConfirmDeleteId(null);
                              setExpandedId(null);
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-ink-faint hover:text-ink-soft"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                          Remove person
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Survey Cards ─────────────────────────────────────────────────────────────

function SurveyCard({
  title,
  completed,
  totalStudents,
  pct,
  onExport,
  responses,
  onDelete,
  previewHref,
}: {
  title: string;
  completed: number;
  totalStudents: number;
  pct: number;
  onExport: () => Promise<void>;
  responses: { id: string; label: string; sublabel: string; completedAt: string | null }[];
  onDelete: (id: string) => Promise<void>;
  previewHref: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [localResponses, setLocalResponses] = useState(responses);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await onDelete(id);
      setLocalResponses((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleClearAll() {
    if (!confirm(`Delete all ${localResponses.length} responses for "${title}"? This cannot be undone.`)) return;
    setClearingAll(true);
    try {
      for (const r of localResponses) {
        await onDelete(r.id);
      }
      setLocalResponses([]);
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <span className="text-xs text-ink-faint">{completed} of {totalStudents} completed</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-tint mb-3">
        <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("secondary", "sm")}
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className={buttonClass("secondary", "sm")}
        >
          <Download size={12} />
          Export CSV
        </button>
        {localResponses.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll}
            className="inline-flex items-center gap-1 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
            {clearingAll ? "Deleting..." : "Delete All"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={buttonClass("secondary", "sm")}
        >
          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide" : "Responses"}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-rule-soft pt-3 space-y-1">
          {localResponses.length === 0 && (
            <p className="text-xs text-ink-faint px-2">No responses yet.</p>
          )}
          {localResponses.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-paper-tint-soft">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink truncate">{r.label}</p>
                <p className="text-[11px] text-ink-faint truncate">{r.sublabel}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                className="shrink-0 rounded p-1 text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete response"
              >
                {deleting === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublicSurveyCard({
  title,
  responseCount,
  programSlug,
  surveyType,
  onExport,
  onDelete,
  onInvite,
  previewHref,
}: {
  title: string;
  responseCount: number;
  programSlug: string;
  surveyType: string;
  onExport: () => Promise<void>;
  onDelete: (email: string) => Promise<void>;
  onInvite: (email: string) => Promise<{ success: boolean; error?: string }>;
  previewHref: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ email: string; full_name: string; completedAt: string | null; invitedAt: string | null; responses: Record<string, unknown> }[]>([]);
  const loaded = useRef(false);

  async function loadResponses() {
    if (loaded.current) return;
    setLoading(true);
    try {
      const data = await listPublicSurveyResponses(programSlug, surveyType);
      setResponses(data.map((r) => ({ email: r.email, full_name: r.full_name, completedAt: r.completed_at, invitedAt: r.invited_at, responses: r.responses })));
      loaded.current = true;
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    setExpanded((v) => !v);
    if (!expanded) loadResponses();
  }

  async function handleDelete(email: string) {
    setDeleting(email);
    try {
      await onDelete(email);
      setResponses((prev) => prev.filter((r) => r.email !== email));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-ink-faint mt-0.5">{responseCount} response{responseCount === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("secondary", "sm")}
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className={buttonClass("secondary", "sm")}
        >
          <Download size={12} />
          Export CSV
        </button>
        {responseCount > 0 && (
          <button
            type="button"
            onClick={handleExpand}
            className={buttonClass("secondary", "sm")}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />}
            {expanded ? "Hide" : "Responses"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 border-t border-rule-soft pt-3 space-y-1">
          {responses.length === 0 && !loading && (
            <p className="text-xs text-ink-faint px-2">No responses found.</p>
          )}
          {responses.map((r) => (
            <div key={r.email} className="border border-rule-soft overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-paper-tint-soft">
                <button
                  type="button"
                  onClick={() => setExpandedEmail(expandedEmail === r.email ? null : r.email)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs font-medium text-ink truncate">{r.full_name}</p>
                  <p className="text-[11px] text-ink-faint truncate">{r.email}{r.completedAt ? ` · ${new Date(r.completedAt).toLocaleDateString()}` : ""}</p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {r.invitedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700" title={`Invited ${new Date(r.invitedAt).toLocaleDateString()}`}>
                      ✓ Invited
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setInviting(r.email);
                        const result = await onInvite(r.email);
                        if (result.success) {
                          setResponses((prev) => prev.map((resp) =>
                            resp.email === r.email ? { ...resp, invitedAt: new Date().toISOString() } : resp
                          ));
                        }
                        setInviting(null);
                      }}
                      disabled={inviting === r.email}
                      className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      title="Accept & send invite email"
                    >
                      {inviting === r.email ? <Loader2 size={11} className="animate-spin" /> : "Send Invite"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedEmail(expandedEmail === r.email ? null : r.email)}
                    className="rounded p-1 text-ink-faint hover:text-ink-soft hover:bg-paper-tint transition-colors"
                    title={expandedEmail === r.email ? "Hide answers" : "View answers"}
                  >
                    <ChevronDown size={13} className={`transition-transform ${expandedEmail === r.email ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.email)}
                    disabled={deleting === r.email}
                    className="rounded p-1 text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete response"
                  >
                    {deleting === r.email ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              {expandedEmail === r.email && (
                <div className="border-t border-rule-soft bg-neutral-50 px-3 py-2 space-y-1.5">
                  {Object.entries(r.responses)
                    .filter(([, val]) => val !== null && val !== undefined && val !== "")
                    .map(([key, val]) => (
                      <div key={key}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-ink mt-0.5">
                          {formatResponseValue(val)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatResponseValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ");
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (typeof val === "object" && val !== null) {
    // dual-likert: { "Statement text": { before: "3", now: "4" } }
    return Object.entries(val as Record<string, unknown>)
      .map(([stmt, rating]) => {
        if (typeof rating === "object" && rating !== null) {
          const r = rating as Record<string, string>;
          return `${stmt}: before ${r.before ?? "—"} → now ${r.now ?? "—"}`;
        }
        return `${stmt}: ${String(rating)}`;
      })
      .join(" · ");
  }
  return String(val);
}

// ─── Survey Links Panel ───────────────────────────────────────────────────────

const PUBLIC_SURVEY_LINKS = [
  { id: "bcc-learner-intake",       label: "BCC Learner Intake",                   path: "/survey/bcc-learner-intake" },
  { id: "bcc-workshop",             label: "Workshop Survey",                       path: "/survey/bcc-workshop" },
  { id: "pre-survey-spring-2026",   label: "Pre-Survey (Spring 2026)",             path: "/survey/pre-survey-spring-2026" },
  { id: "post-survey-spring-2026",  label: "Post-Survey (Spring 2026)",            path: "/survey/post-survey-spring-2026" },
  { id: "network-plus-post",        label: "Network+ End-of-Cohort Survey",        path: "/survey/network-plus-post" },
  { id: "security-plus-application",label: "Security+ Application",               path: "/apply/security-plus" },
];

function GroupsPanel({
  cohorts,
  tracks,
}: {
  cohorts: CohortRow[];
  tracks: AdminTrackConfig[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [trackSlug, setTrackSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [totalWeeks, setTotalWeeks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackSlug || !displayName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCohortAction({
        track_slug: trackSlug,
        display_name: displayName.trim(),
        start_date: startDate || null,
        total_weeks: totalWeeks ? parseInt(totalWeeks, 10) : null,
      });
      setShowForm(false);
      setTrackSlug("");
      setDisplayName("");
      setStartDate("");
      setTotalWeeks("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Groups
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-ink-faint hover:text-ink-soft transition-colors"
          >
            + New Group
          </button>
        )}
      </div>

      {cohorts.length === 0 && !showForm && (
        <p className="text-sm text-ink-faint">
          No groups yet. Create one to organize students by track and cohort.
        </p>
      )}

      {cohorts.length > 0 && (
        <div className="divide-y divide-rule overflow-hidden panel">
          {cohorts.map((c) => {
            const dest = c.track_slug
              ? `/dashboard/admin?tab=${c.track_slug}&view=students`
              : `/dashboard/admin?tab=students`;
            return (
              <Link
                key={c.id}
                href={dest}
                className="group flex items-center gap-4 px-4 py-3.5 hover:bg-paper-tint-soft transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink truncate">
                    {c.display_name || c.name}
                  </p>
                  {c.track_slug && (
                    <p className="text-[12px] text-ink-faint truncate">
                      {trackLabel(c.track_slug)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-ink-faint group-hover:text-ink-soft transition-colors">→</span>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="panel p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-ink">New group</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-ink-soft">Track</label>
              <div className="relative mt-1">
                <select
                  required
                  value={trackSlug}
                  onChange={(e) => setTrackSlug(e.target.value)}
                  className="w-full appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-2 text-sm text-ink focus:border-ink-faint focus:outline-none"
                >
                  <option value="">— select track —</option>
                  {tracks.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.shortName || t.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint">▾</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Security+ · Cohort 1"
                className={`${fieldInput} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Start date (optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${fieldInput} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Duration in weeks (optional)</label>
              <input
                type="number"
                min="1"
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value)}
                placeholder="e.g. 10"
                className={`${fieldInput} mt-1`}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={buttonClass("secondary", "sm")}
            >
              {submitting ? "Creating…" : "Create group"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-xs text-ink-faint hover:text-ink-soft transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

function SurveyLinksPanel({ surveyConfigs }: { surveyConfigs: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (path: string, id: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const authLinks = surveyConfigs.map((s) => ({
    id: s.id,
    label: s.title,
    path: `/dashboard/survey/${s.id}`,
    auth: true,
  }));

  const allLinks = [
    ...PUBLIC_SURVEY_LINKS.map((s) => ({ ...s, auth: false })),
    ...authLinks,
  ];

  return (
    <div className="panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-paper-tint-soft transition-colors"
      >
        <span className="text-[14px] font-semibold text-ink">
          {allLinks.length} survey {allLinks.length === 1 ? "link" : "links"}
        </span>
        <span className="text-ink-faint text-xs">{open ? "↑ collapse" : "↓ expand"}</span>
      </button>
      {open && (
        <div className="divide-y divide-rule border-t border-rule">
          {allLinks.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{s.label}</p>
                <p className="text-[11px] text-ink-faint font-mono truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}${s.path}` : s.path}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.auth && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint border border-rule px-1.5 py-0.5">
                    login required
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => copy(s.path, s.id)}
                  className={buttonClass("secondary", "sm")}
                >
                  {copied === s.id ? "✓ Copied" : "Copy link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

