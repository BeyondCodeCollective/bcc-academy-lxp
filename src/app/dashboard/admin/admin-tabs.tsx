"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { addStudentAction, deleteStudentAction, updateStudentAction, updateCohortAction, saveSessionContent, assignStudentTrack, removeStudentTrack, bulkAssignTrack, exportSurveyResponses, exportPublicSurveyResponses, getAllSubmissions, getAllReflections, addFeedback, assignInstructorTrack, removeInstructorTrack, deleteSurveyResponse, deletePublicSurveyResponse, listPublicSurveyResponses, sendInviteAction } from "./actions";
import type { SessionResource, StudentTrackRow, SurveyStatsRow, AdminSubmissionRow, AdminReflectionRow, InstructorTrackRow, PublicSurveyStatsRow } from "./actions";
import { canManageStudents, canSwitchPrograms } from "@/lib/roles";
import {
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  Save,
  ChevronDown,
  Shield,
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
} from "lucide-react";
import { LunchLearnAdmin } from "@/app/dashboard/lunch-learn/admin/admin-client";
import { AttendanceTab } from "./attendance-tab";
import { TrackInsightsSection } from "@/components/track-insights-section";
import { Avatar } from "@/components/avatar";
import { computeCurrentWeek } from "@/lib/utils";
import { InsightsDashboard } from "./insights/insights-dashboard";
import { TrackOverviewForm } from "./track-overview-form";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import type { InsightsData } from "./page";
import type { Student } from "@/lib/types";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { iconForTrack, toneForTrack } from "@/lib/track-visual";
import { Clipboard as ClipboardListIcon, Users as UsersIcon, Coffee as CoffeeIcon, ChartBar as ChartBarIcon, ArrowLeft as ArrowLeftIcon } from "@phosphor-icons/react";

const PLATFORM_SURVEY_TITLES: Record<string, string> = {
  "bcc-learner-intake": "BCC Learner Intake",
  "bcc-workshop": "Workshop Survey",
};

type CohortRow = {
  id: string;
  name: string;
  display_name: string | null;
  start_date: string;
  total_weeks: number;
};

type StudentRow = Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">;

// Track config passed from server (subset of TrackConfig)
type AdminTrackConfig = {
  slug: string;
  name: string;
  shortName: string;
  description?: string;
  type?: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  instructor: string;
  sessionTimes: string[];
  startDate: string;
  lastSessionDayOffset: number;
  weekSummaries: { week: number; topic: string; icon: string }[];
  defaultReflectionPrompts?: string[];
  submissionsEnabled?: boolean;
  reflectionsEnabled?: boolean;
  weeks: {
    week: number;
    title: string;
    icon: string;
    sessions: { title: string }[];
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
  status: string;
  status_2: string;
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
        meetingLink: i === 0 ? content.meeting_link : i === 1 ? content.meeting_link_2 : s.meetingLink,
        recordingUrl: i === 0 ? content.recording_url : i === 1 ? content.recording_url_2 : s.recordingUrl,
        status: (i === 0 ? content.status : i === 1 ? content.status_2 : s.status) as "upcoming" | "completed",
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
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50 min-h-[36px]"
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
        <label className="text-xs font-medium text-neutral-500">Resources</label>
        <div className="flex items-center gap-1.5">
          <UploadButton accept={FILE_ACCEPT} label="Upload File" icon={Upload} track={track} week={week} onUploaded={handleFileUploaded} />
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors min-h-[36px]"
          >
            <Plus size={11} />
            Add Link
          </button>
        </div>
      </div>

      {resources.length === 0 && (
        <p className="text-[11px] text-neutral-400 pl-0.5">No resources yet</p>
      )}

      {resources.map((r, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="mt-2 shrink-0">
            {r.type === "file" || isStorageUrl(r.url) ? (
              <FileText size={12} className="text-neutral-400" />
            ) : (
              <LinkIcon size={12} className="text-neutral-400" />
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={r.name}
              onChange={(e) => updateResource(i, "name", e.target.value)}
              placeholder="Display name"
              className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
            {r.type === "file" || isStorageUrl(r.url) ? (
              <div className="border border-neutral-100 bg-muted-bg px-3 py-2 text-xs text-neutral-400 truncate">
                {r.url.split("/").pop() ?? r.url}
              </div>
            ) : (
              <input
                type="url"
                value={r.url}
                onChange={(e) => updateResource(i, "url", e.target.value)}
                placeholder="https://..."
                className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => removeResource(i)}
            className="mt-2 text-neutral-300 hover:text-red-400 transition-colors shrink-0"
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
  if (state === "saving") return <span className="text-[11px] text-neutral-400">Saving...</span>;
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
  userRole = "admin",
  engagementScores = {},
  initialTab,
  lunchLearnRecordings = [],
  insightsData = null,
  alumniEnrollments = [],
}: {
  cohorts: CohortRow[];
  students: StudentRow[];
  tracks: AdminTrackConfig[];
  studentTracks: StudentTrackRow[];
  instructorTracks?: InstructorTrackRow[];
  programSlug: string;
  surveyStats: Record<string, SurveyStatsRow[]>;
  surveyConfigs: { id: string; title: string }[];
  userRole?: string;
  engagementScores?: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }>;
  initialTab?: string;
  lunchLearnRecordings?: { id: string; title: string; presenter: string; recording_url: string; description: string | null; recorded_at: string }[];
  insightsData?: InsightsData | null;
  alumniEnrollments?: { track_slug: string; email: string; source: string }[];
}) {
  const programSlug = initialProgramSlug;
  const isManager = canManageStudents(userRole);
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
  const [trackView, setTrackView] = useState<"overview" | "curriculum" | "student-work" | "insights">("overview");
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


  // Load initial session content from the API for all tracks
  useEffect(() => {
    async function loadContent(trackSlug: string) {
      try {
        const res = await fetch(`/api/session-content?track=${trackSlug}`);
        if (!res.ok) return;
        const json = await res.json() as { rows: Array<{
          week_number: number;
          meeting_link: string | null;
          recording_url: string | null;
          meeting_link_2: string | null;
          recording_url_2: string | null;
          status: string | null;
          status_2: string | null;
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
            status: row.status ?? "upcoming",
            status_2: row.status_2 ?? "upcoming",
            resources: row.resources ?? [],
            title: row.title ?? null,
            subtitle: row.subtitle ?? null,
            description: row.description ?? null,
            objectives: row.objectives ?? null,
          };
        }
        setTrackData((prev) => ({
          ...prev,
          [trackSlug]: applyContentMap(prev[trackSlug] ?? [], map),
        }));
      } catch {
        // API unavailable — silently no-op
      }
    }
    for (const t of tracks) {
      loadContent(t.slug);
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
          status: weekData.sessions[0]?.status ?? "upcoming",
          status_2: weekData.sessions[1]?.status ?? "upcoming",
          title: weekData.overrideTitle || null,
          subtitle: weekData.overrideSubtitle || null,
          description: weekData.overrideDescription || null,
          objectives: objectivesArr,
          resources: allResources,
        });
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
          <header>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
              Admin
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900">
              No program selected
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {canSwitchPrograms(userRole)
                ? "This domain doesn't have a learner dashboard. Pick a program from the sidebar to manage its tracks, or open Insights for cross-program analytics."
                : "This domain doesn't have a learner dashboard. Contact a super-admin to switch programs."}
            </p>
          </header>
          {canSwitchPrograms(userRole) && (
            <a
              href="/dashboard/insights"
              className="inline-flex items-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              View Insights
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

        return (
          <div className="space-y-8">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                  Admin
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Pick a program to manage — curriculum, roster, student work, and attendance.
                </p>
              </div>
              <div className="flex items-center gap-0.5 pt-1">
                <Link
                  href="/dashboard/admin?tab=students"
                  title="All people"
                  className="flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900"
                >
                  <UsersIcon size={16} weight="bold" aria-label="All people" />
                </Link>
                <Link
                  href="/dashboard/admin?tab=student-work"
                  title="Student work"
                  className="flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900"
                >
                  <ClipboardListIcon size={16} weight="bold" aria-label="Student work" />
                </Link>
                <Link
                  href="/dashboard/admin?tab=attendance"
                  title="Attendance"
                  className="flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900"
                >
                  <ChartBarIcon size={16} weight="bold" aria-label="Attendance" />
                </Link>
                {isManager && (
                  <Link
                    href="/dashboard/admin?tab=lunch-learn"
                    title="Lunch & Learns"
                    className="flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900"
                  >
                    <CoffeeIcon size={16} weight="bold" aria-label="Lunch & Learns" />
                  </Link>
                )}
              </div>
            </header>

            {/* Quick-access tool strip — always visible above the program grid */}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/admin?tab=students"
                className="inline-flex items-center gap-2 border border-rule bg-surface-elevated px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <UsersIcon size={13} weight="bold" aria-hidden />
                All people
              </Link>
              <Link
                href="/dashboard/admin?tab=student-work"
                className="inline-flex items-center gap-2 border border-rule bg-surface-elevated px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <ClipboardListIcon size={13} weight="bold" aria-hidden />
                Student work
              </Link>
              <Link
                href="/dashboard/admin?tab=attendance"
                className="inline-flex items-center gap-2 border border-rule bg-surface-elevated px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <ChartBarIcon size={13} weight="bold" aria-hidden />
                Attendance
              </Link>
              {isManager && (
                <Link
                  href="/dashboard/admin?tab=lunch-learn"
                  className="inline-flex items-center gap-2 border border-rule bg-surface-elevated px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                >
                  <CoffeeIcon size={13} weight="bold" aria-hidden />
                  Lunch &amp; Learns
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tracks.map((t) => {
                const tone = toneForTrack(t.slug);
                const Icon = iconForTrack(t.slug);
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
                    : started
                      ? `Week ${currentWeek} of ${t.totalWeeks}`
                      : `Starts ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                const count = studentCountFor(t.slug);
                return (
                  <Link
                    key={t.slug}
                    href={`/dashboard/admin?tab=${t.slug}`}
                    className="group flex h-full flex-col overflow-hidden border border-rule bg-surface-elevated text-left transition-colors hover:border-neutral-300"
                  >
                    <div
                      aria-hidden
                      className="relative flex aspect-video w-full items-center justify-center overflow-hidden"
                      style={{ backgroundColor: `${tone}1A` }}
                    >
                      <Icon size={48} weight="light" color={tone} />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        {status}
                      </p>
                      <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-neutral-900 line-clamp-2">
                        {t.shortName || t.name}
                      </h3>
                      <p className="mt-1 text-[12px] text-neutral-500">
                        with {t.instructor}
                      </p>
                      <p className="mt-auto pt-3 text-[12px] text-neutral-500">
                        {count} {count === 1 ? "student" : "students"}
                      </p>
                    </div>
                  </Link>
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
        const startLabel = new Date(activeTrack.startDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
        <div className="space-y-4">
          {/* Back to Admin home */}
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-neutral-700"
          >
            <ArrowLeftIcon size={11} weight="bold" aria-hidden />
            Admin
          </Link>

          {/* Track header */}
          <header className="space-y-1.5">
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
              {activeTrack.name}
            </h1>
            <p className="text-xs text-neutral-500">
              with {activeTrack.instructor} &middot;{" "}
              {activeTrack.sessionTimes.join(" & ")}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-neutral-600">
              <span className="tabular-nums">
                <strong className="font-semibold text-neutral-900">{enrolledInTrack}</strong>{" "}
                student{enrolledInTrack === 1 ? "" : "s"}
              </span>
              <span className="tabular-nums">
                {notStarted
                  ? `Starts ${startLabel}`
                  : `Week ${currentWeek} of ${activeTrack.totalWeeks}`}
              </span>
              <span className="tabular-nums text-neutral-400">
                {activeTrack.totalWeeks} weeks total
              </span>
            </div>
          </header>

          {/* Sub-tab bar within the track */}
          <div className="flex gap-1 bg-neutral-100 p-1">
            {[
              { id: "overview" as const, label: "Overview" },
              { id: "curriculum" as const, label: "Curriculum" },
              { id: "student-work" as const, label: "Student Work" },
              { id: "insights" as const, label: "Insights" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setTrackView(v.id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  trackView === v.id
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          {trackView === "overview" && (
            <TrackOverviewForm key={activeTrack.slug} track={activeTrack} />
          )}

          {trackView === "curriculum" && (
          <div className="space-y-3">
          {activeWeeks.map((aw) => {
            const hasMultipleSessions = aw.sessions.length > 1;
            return (
              <div key={aw.week} className="border border-rule bg-surface-elevated overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(expandedWeek === aw.week ? null : aw.week)}
                  className="flex w-full items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[11px] font-semibold tabular-nums text-neutral-600">
                      {aw.week}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-neutral-900">
                        {aw.title}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {aw.sessions.length} session{aw.sessions.length !== 1 ? "s" : ""}
                        {aw.sessions.some((s) => s.recordingUrl) && " · Recording set"}
                        {aw.sessions.some((s) => s.resources.length > 0) && " · Has resources"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveIndicator state={saveStates[activeTrack.slug]?.[aw.week] ?? "idle"} />
                    <span className={`h-2 w-2 rounded-full ${aw.sessions.every((s) => s.status === "completed") ? "bg-green-500" : "bg-neutral-300"}`} />
                    <ChevronDown size={16} className={`text-neutral-400 transition-transform ${expandedWeek === aw.week ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expandedWeek === aw.week && (
                  <div className="border-t border-neutral-100">
                    {/* Content overrides */}
                    <div className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3 border-b border-neutral-100">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        Session Content
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-neutral-500">Title</label>
                          <input
                            type="text"
                            value={aw.overrideTitle}
                            onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideTitle: e.target.value })}
                            placeholder={aw.title}
                            className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-500">Subtitle</label>
                          <input
                            type="text"
                            value={aw.overrideSubtitle}
                            onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideSubtitle: e.target.value })}
                            placeholder="e.g. Industry Perspectives"
                            className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Description</label>
                        <textarea
                          value={aw.overrideDescription}
                          onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideDescription: e.target.value })}
                          placeholder="Leave blank to use the default description"
                          rows={2}
                          className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">
                          What You&apos;ll Cover <span className="font-normal text-neutral-300">(one per line)</span>
                        </label>
                        <textarea
                          value={aw.overrideObjectives}
                          onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideObjectives: e.target.value })}
                          placeholder="Leave blank to use defaults"
                          rows={4}
                          className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Sessions */}
                    <div className={hasMultipleSessions ? "divide-y divide-neutral-100" : ""}>
                    {aw.sessions.map((s) => (
                      <div key={s.num} className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">
                        {hasMultipleSessions && (
                          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                            Session {s.num}: {s.title}
                          </p>
                        )}

                        {/* Meeting link */}
                        <div>
                          <label className="text-xs font-medium text-neutral-500">Google Meet Link</label>
                          <input
                            type="url"
                            value={s.meetingLink}
                            onChange={(e) => updateSession(activeTrack.slug, aw.week, s.num, { meetingLink: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                          />
                        </div>

                        {/* Recording — URL paste + file upload */}
                        <div>
                          <label className="text-xs font-medium text-neutral-500">Recording</label>
                          <div className="mt-1 flex gap-2 items-start">
                            <input
                              type="url"
                              value={s.recordingUrl}
                              onChange={(e) => updateSession(activeTrack.slug, aw.week, s.num, { recordingUrl: e.target.value })}
                              placeholder="https://youtube.com/... or https://drive.google.com/..."
                              className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                            />
                            <UploadButton accept={VIDEO_ACCEPT} label="Upload Recording" icon={Video}
                              track={activeTrack.slug}
                              week={aw.week}
                              onUploaded={({ url }) => updateSession(activeTrack.slug, aw.week, s.num, { recordingUrl: url })}
                            />
                          </div>
                          {s.recordingUrl && isStorageUrl(s.recordingUrl) && (
                            <p className="mt-1 text-[10px] text-neutral-400">
                              Uploaded file · <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-700">Preview</a>
                            </p>
                          )}
                        </div>

                        {/* Resources */}
                        <div className="border border-neutral-100 bg-neutral-50 p-3">
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
                              className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                            />
                            <span className="text-sm text-neutral-700">Mark as completed</span>
                          </label>
                          {s.meetingLink && (
                            <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-900">
                              Open Meet <ExternalLink size={12} />
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

          {/* Student Work sub-view — scoped to this track */}
          {trackView === "student-work" && (
            <StudentWorkTab tracks={[activeTrack]} programSlug={programSlug} />
          )}

          {/* Insights sub-view — scoped to this track. Attendance + engagement
             on top, surveys/reflections summary below. */}
          {trackView === "insights" && (
            <div className="space-y-8">
              <AttendanceTab
                students={trackStudents.filter((s) => s.role === "student")}
                tracks={[activeTrack]}
                scopeLabel={activeTrack.shortName}
              />
              <TrackInsightsSection
                trackSlug={activeTrack.slug}
                trackShortName={activeTrack.shortName}
                programSlug={programSlug}
                totalWeeks={activeTrack.totalWeeks}
                enrolledStudentCount={trackStudentIds?.size ?? 0}
                surveyConfigs={surveyConfigs}
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
          programSlug={programSlug}
          enrollmentSaving={enrollmentSaving}
          instrTrackSaving={instrTrackSaving}
          studentSaving={studentSaving}
          onUpdateStudent={updateStudent}
          onDeleteStudent={deleteStudent}
          onToggleStudentTrack={toggleTrackEnrollment}
          onToggleInstructorTrack={toggleInstructorTrack}
          onStudentAdded={(s) => setStudents((prev) => [...prev, s])}
        />
      )}

      {/* Standalone Student Work (from sidebar, all tracks) */}
      {tab === "student-work" && (
        <StudentWorkTab tracks={tracks} programSlug={programSlug} />
      )}

      {/* Standalone Analytics (from sidebar, all tracks) */}
      {tab === "attendance" && (
        <AttendanceTab
          students={students.filter((s) => s.role === "student")}
          tracks={tracks}
          scopeLabel="All tracks"
        />
      )}

      {/* Lunch & Learn management */}
      {tab === "lunch-learn" && (
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
              Lunch &amp; Learns
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              {lunchLearnRecordings.length} recording
              {lunchLearnRecordings.length === 1 ? "" : "s"} for internal staff
            </p>
          </header>
          <LunchLearnAdmin recordings={lunchLearnRecordings} embedded />
        </div>
      )}

      {/* Survey Insights — per-program survey management + cross-program
         response viewer. The Overview tab used to host the Pre/Post survey
         cards too; they were noisy there and properly belong here next to
         the response data. The bare /dashboard/insights route hosts the
         broader operational dashboard (engagement, attendance, alumni). */}
      {tab === "insights" && (
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
              Survey Insights
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Per-program survey management and cross-program responses
            </p>
          </header>

          {surveyConfigs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
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
          ) : canSwitchPrograms(userRole) ? (
            <div className="border border-rule bg-surface-elevated p-8 text-center space-y-2">
              <p className="text-sm font-medium text-neutral-900">
                Insights didn&apos;t load
              </p>
              <p className="text-sm text-neutral-500">
                Refresh the page. If it still doesn&apos;t load, the
                cross-program survey query may have failed — check the Vercel
                runtime logs for this request.
              </p>
            </div>
          ) : (
            <div className="border border-rule bg-surface-elevated p-8 text-center">
              <p className="text-sm text-neutral-500">
                Insights are only available to super-admins.
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
}: {
  tracks: AdminTrackConfig[];
  programSlug: string;
}) {
  const [view, setView] = useState<"submissions" | "reflections">("submissions");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([]);
  const [reflections, setReflections] = useState<AdminReflectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [subs, refs] = await Promise.all([
          getAllSubmissions(programSlug, trackFilter !== "all" ? trackFilter : undefined),
          getAllReflections(programSlug, trackFilter !== "all" ? trackFilter : undefined),
        ]);
        setSubmissions(subs);
        setReflections(refs);
      } catch (err) {
        console.error("Failed to load student work:", err);
      }
      setLoading(false);
    }
    load();
  }, [programSlug, trackFilter]);

  async function handleSendFeedback(itemId: string, type: "submission" | "reflection") {
    const text = feedbackText[itemId]?.trim();
    if (!text) return;
    setSendingFeedback(itemId);
    try {
      await addFeedback({
        submissionId: type === "submission" ? itemId : undefined,
        reflectionId: type === "reflection" ? itemId : undefined,
        comment: text,
      });
      setFeedbackText((prev) => ({ ...prev, [itemId]: "" }));
      // Update feedback count locally
      if (type === "submission") {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === itemId ? { ...s, feedback_count: s.feedback_count + 1 } : s))
        );
      } else {
        setReflections((prev) =>
          prev.map((r) => (r.id === itemId ? { ...r, feedback_count: r.feedback_count + 1 } : r))
        );
      }
    } catch (err) {
      console.error("Failed to send feedback:", err);
    }
    setSendingFeedback(null);
  }

  const filteredSubmissions = submissions.filter((s) =>
    weekFilter === "all" ? true : s.week_number === weekFilter
  );
  const filteredReflections = reflections.filter((r) =>
    weekFilter === "all" ? true : r.week_number === weekFilter
  );

  const maxWeeks = Math.max(...tracks.map((t) => t.totalWeeks), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Student Work</h2>
      </div>

      {/* View toggle + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-neutral-100 p-0.5">
          <button
            onClick={() => setView("submissions")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "submissions" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setView("reflections")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "reflections" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            Reflections
          </button>
        </div>

        <div className="relative">
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="appearance-none border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
          >
            <option value="all">All Tracks</option>
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>{t.shortName}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>

        <div className="relative">
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="appearance-none border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
          >
            <option value="all">All Weeks</option>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>

        <span className="text-xs text-neutral-400 ml-auto">
          {view === "submissions" ? filteredSubmissions.length : filteredReflections.length} result{(view === "submissions" ? filteredSubmissions.length : filteredReflections.length) !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-neutral-400" />
        </div>
      )}

      {!loading && view === "submissions" && (
        <div className="space-y-2">
          {filteredSubmissions.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">No submissions yet</p>
          )}
          {filteredSubmissions.map((sub) => (
            <div key={sub.id} className="border border-rule bg-surface-elevated overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{sub.student_name}</p>
                    <p className="text-[11px] text-neutral-400">
                      {tracks.find((t) => t.slug === sub.track_slug)?.shortName ?? sub.track_slug} &middot; Week {sub.week_number}
                      {sub.submitted_at && ` &middot; ${new Date(sub.submitted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sub.feedback_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 rounded-full px-1.5 py-0.5">
                      <MessageSquare size={10} /> {sub.feedback_count}
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expandedId === sub.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedId === sub.id && (
                <div className="border-t border-neutral-100 px-4 py-3 space-y-3">
                  {sub.description && (
                    <div>
                      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-neutral-700">{sub.description}</p>
                    </div>
                  )}
                  {sub.links.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Links</p>
                      <div className="space-y-1">
                        {sub.links.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900">
                            <ExternalLink size={12} className="shrink-0" />
                            {link.label || link.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {sub.files.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Files</p>
                      <div className="space-y-1">
                        {sub.files.map((file, i) => (
                          <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900">
                            <FileText size={12} className="shrink-0" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Feedback input */}
                  <div className="pt-2 border-t border-neutral-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedbackText[sub.id] ?? ""}
                        onChange={(e) => setFeedbackText((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Leave feedback..."
                        className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendFeedback(sub.id, "submission");
                          }
                        }}
                      />
                      <button
                        onClick={() => handleSendFeedback(sub.id, "submission")}
                        disabled={!feedbackText[sub.id]?.trim() || sendingFeedback === sub.id}
                        className="inline-flex items-center gap-1 bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                      >
                        {sendingFeedback === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && view === "reflections" && (
        <div className="space-y-2">
          {filteredReflections.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">No reflections yet</p>
          )}
          {filteredReflections.map((ref) => (
            <div key={ref.id} className="border border-rule bg-surface-elevated overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{ref.student_name}</p>
                    <p className="text-[11px] text-neutral-400">
                      {tracks.find((t) => t.slug === ref.track_slug)?.shortName ?? ref.track_slug} &middot; Week {ref.week_number}
                      {ref.submitted_at && ` &middot; ${new Date(ref.submitted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ref.feedback_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 rounded-full px-1.5 py-0.5">
                      <MessageSquare size={10} /> {ref.feedback_count}
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expandedId === ref.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedId === ref.id && (
                <div className="border-t border-neutral-100 px-4 py-3 space-y-3">
                  {Object.entries(ref.responses)
                    .filter(([key]) => key !== "_additional")
                    .map(([prompt, answer]) => (
                      <div key={prompt}>
                        <p className="text-[11px] font-medium text-neutral-400 mb-0.5">{prompt}</p>
                        <p className="text-sm text-neutral-700">{answer}</p>
                      </div>
                    ))}
                  {ref.responses["_additional"] && (
                    <div>
                      <p className="text-[11px] font-medium text-neutral-400 mb-0.5">Additional thoughts</p>
                      <p className="text-sm text-neutral-700">{ref.responses["_additional"]}</p>
                    </div>
                  )}
                  {/* Feedback input */}
                  <div className="pt-2 border-t border-neutral-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedbackText[ref.id] ?? ""}
                        onChange={(e) => setFeedbackText((prev) => ({ ...prev, [ref.id]: e.target.value }))}
                        placeholder="Leave feedback..."
                        className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendFeedback(ref.id, "reflection");
                          }
                        }}
                      />
                      <button
                        onClick={() => handleSendFeedback(ref.id, "reflection")}
                        disabled={!feedbackText[ref.id]?.trim() || sendingFeedback === ref.id}
                        className="inline-flex items-center gap-1 bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                      >
                        {sendingFeedback === ref.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
}: {
  students: StudentRow[];
  cohorts: CohortRow[];
  tracks: AdminTrackConfig[];
  enrollments: StudentTrackRow[];
  instrTracks: InstructorTrackRow[];
  engagementScores: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }>;
  isManager: boolean;
  programSlug: string;
  enrollmentSaving: string | null;
  instrTrackSaving: string | null;
  studentSaving: string | null;
  onUpdateStudent: (id: string, field: "role" | "cohort_id", value: string) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onToggleStudentTrack: (studentId: string, trackSlug: string) => Promise<void>;
  onToggleInstructorTrack: (instructorId: string, trackSlug: string) => Promise<void>;
  onStudentAdded: (student: StudentRow) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkTrack, setBulkTrack] = useState(tracks[0]?.slug ?? "");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"student" | "instructor" | "admin">("student");
  const [addCohortId, setAddCohortId] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState("");

  const filtered = students.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      `${s.first_name ?? ""} ${s.last_name ?? ""} ${s.email ?? ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
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

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddingStudent(true);
    setAddError("");
    try {
      const result = await addStudentAction({
        email: addEmail.trim(),
        first_name: addFirstName.trim(),
        last_name: addLastName.trim(),
        role: addRole,
        cohort_id: addCohortId || null,
      });
      onStudentAdded(result.student as StudentRow);
      setAddFirstName("");
      setAddLastName("");
      setAddEmail("");
      setAddRole("student");
      setAddCohortId("");
      setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add person");
    }
    setAddingStudent(false);
  }

  const studentCount = students.filter((s) => s.role === "student").length;
  const instructorCount = students.filter((s) => s.role === "instructor").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">People</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {studentCount} {studentCount === 1 ? "student" : "students"} · {instructorCount} {instructorCount === 1 ? "instructor" : "instructors"}
          </p>
        </div>
        {isManager && (
          <div className="flex flex-wrap items-center gap-2">
            {showBulkAssign ? (
              <>
                <div className="relative">
                  <select
                    value={bulkTrack}
                    onChange={(e) => setBulkTrack(e.target.value)}
                    className="appearance-none border border-neutral-200 bg-white pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
                  >
                    {tracks.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.shortName}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={bulkSelected.size === 0 || bulkSaving}
                  className="inline-flex items-center gap-1.5 bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                  {bulkSaving ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                  Assign{bulkSelected.size > 0 ? ` (${bulkSelected.size})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBulkAssign(false); setBulkSelected(new Set()); }}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowBulkAssign(true)}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  <Users size={13} />
                  Bulk assign
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
                >
                  <UserPlus size={13} />
                  Add person
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add person form */}
      {showAddForm && (
        <form onSubmit={handleAddStudent} className="border border-rule bg-surface-elevated p-4 space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Add person</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-neutral-500">First name</label>
              <input
                type="text"
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                placeholder="First"
                className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Last name</label>
              <input
                type="text"
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                placeholder="Last"
                className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Email *</label>
              <input
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Role</label>
              <div className="relative mt-1">
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "student" | "instructor" | "admin")}
                  className="w-full appearance-none border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
            {cohorts.length > 0 && (
              <div>
                <label className="text-xs font-medium text-neutral-500">Cohort</label>
                <div className="relative mt-1">
                  <select
                    value={addCohortId}
                    onChange={(e) => setAddCohortId(e.target.value)}
                    className="w-full appearance-none border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="">No cohort</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
            )}
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={addingStudent || !addEmail.trim()}
              className="inline-flex items-center gap-1.5 bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {addingStudent ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {addingStudent ? "Adding..." : "Add person"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="inline-flex items-center gap-1.5 border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[200px] border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
        />
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="instructor">Instructors</option>
            <option value="admin">Admins</option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>
        <span className="text-xs text-neutral-400">{filtered.length} shown</span>
      </div>

      {/* Roster */}
      <div className="divide-y divide-neutral-100 border border-rule bg-surface-elevated">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">No people found.</p>
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
                className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer select-none"
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
                    className="h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
                  />
                )}
                <Avatar
                  firstName={s.first_name ?? ""}
                  lastName={s.last_name ?? ""}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {fullName}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">{s.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-neutral-400 tabular-nums hidden sm:block">
                    {trackCount} {trackCount === 1 ? "track" : "tracks"}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.role === "student"
                        ? "bg-neutral-100 text-neutral-600"
                        : s.role === "instructor"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.role}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {isExpanded && (
                <div
                  className="border-t border-neutral-100 bg-neutral-50 px-4 py-4 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Role + cohort */}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                        Role
                      </label>
                      <div className="relative mt-1">
                        <select
                          value={s.role}
                          disabled={studentSaving === s.id}
                          onChange={(e) => onUpdateStudent(s.id, "role", e.target.value)}
                          className="appearance-none border border-neutral-200 bg-white pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                          <option value="super-admin">Super Admin</option>
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                      </div>
                    </div>
                    {cohorts.length > 0 && (
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                          Cohort
                        </label>
                        <div className="relative mt-1">
                          <select
                            value={s.cohort_id ?? ""}
                            disabled={studentSaving === s.id}
                            onChange={(e) => onUpdateStudent(s.id, "cohort_id", e.target.value)}
                            className="appearance-none border border-neutral-200 bg-white pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
                          >
                            <option value="">No cohort</option>
                            {cohorts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.display_name || c.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Track chips */}
                  {(s.role === "student" || s.role === "instructor") && tracks.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 mb-2">
                        {s.role === "instructor" ? "Teaching" : "Enrolled tracks"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tracks.map((t) => {
                          const savingKey = `${s.id}-${t.slug}`;
                          const enrolled =
                            s.role === "student"
                              ? studentSlugs.includes(t.slug)
                              : instructorSlugs.includes(t.slug);
                          const isSaving =
                            s.role === "student"
                              ? enrollmentSaving === savingKey
                              : instrTrackSaving === savingKey;
                          return (
                            <button
                              key={t.slug}
                              type="button"
                              onClick={() =>
                                s.role === "student"
                                  ? onToggleStudentTrack(s.id, t.slug)
                                  : onToggleInstructorTrack(s.id, t.slug)
                              }
                              disabled={isSaving}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
                                enrolled
                                  ? "bg-neutral-900 text-white"
                                  : "border border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
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
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      <span>
                        <strong className="font-semibold text-neutral-900">
                          {engagementScores[s.id].total}
                        </strong>
                        /100 engagement
                      </span>
                      <span className="text-neutral-300">·</span>
                      <span>{engagementScores[s.id].attendance} attended</span>
                      <span className="text-neutral-300">·</span>
                      <span>{engagementScores[s.id].submissions} submitted</span>
                      <span className="text-neutral-300">·</span>
                      <span>{engagementScores[s.id].reflections} reflected</span>
                    </div>
                  )}

                  {/* Remove person */}
                  {isManager && (
                    <div className="border-t border-neutral-200 pt-3">
                      {confirmDeleteId === s.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500">
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
                            className="text-xs text-neutral-400 hover:text-neutral-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors"
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
    <div className="border border-rule bg-surface-elevated p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <span className="text-xs text-neutral-400">{completed} of {totalStudents} completed</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 mb-3">
        <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
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
          className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide" : "Responses"}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-neutral-100 pt-3 space-y-1">
          {localResponses.length === 0 && (
            <p className="text-xs text-neutral-400 px-2">No responses yet.</p>
          )}
          {localResponses.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-neutral-50">
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-800 truncate">{r.label}</p>
                <p className="text-[11px] text-neutral-400 truncate">{r.sublabel}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                className="shrink-0 rounded p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
    <div className="border border-rule bg-surface-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{responseCount} response{responseCount === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
        {responseCount > 0 && (
          <button
            type="button"
            onClick={handleExpand}
            className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />}
            {expanded ? "Hide" : "Responses"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 border-t border-neutral-100 pt-3 space-y-1">
          {responses.length === 0 && !loading && (
            <p className="text-xs text-neutral-400 px-2">No responses found.</p>
          )}
          {responses.map((r) => (
            <div key={r.email} className="border border-neutral-100 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setExpandedEmail(expandedEmail === r.email ? null : r.email)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs font-medium text-neutral-800 truncate">{r.full_name}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{r.email}{r.completedAt ? ` · ${new Date(r.completedAt).toLocaleDateString()}` : ""}</p>
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
                    className="rounded p-1 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                    title={expandedEmail === r.email ? "Hide answers" : "View answers"}
                  >
                    <ChevronDown size={13} className={`transition-transform ${expandedEmail === r.email ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.email)}
                    disabled={deleting === r.email}
                    className="rounded p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete response"
                  >
                    {deleting === r.email ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              {expandedEmail === r.email && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-3 py-2 space-y-1.5">
                  {Object.entries(r.responses)
                    .filter(([, val]) => val !== null && val !== undefined && val !== "")
                    .map(([key, val]) => (
                      <div key={key}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-neutral-700 mt-0.5">
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

