"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { AttendanceTab } from "./attendance-tab";
import type { Student } from "@/lib/types";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { computeCurrentWeek } from "@/lib/utils";

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
  totalWeeks: number;
  sessionsPerWeek: number;
  instructor: string;
  sessionTimes: string[];
  startDate: string;
  lastSessionDayOffset: number;
  weekSummaries: { week: number; topic: string; icon: string }[];
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
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
            {r.type === "file" || isStorageUrl(r.url) ? (
              <div className="rounded-lg border border-neutral-100 bg-neutral-100 px-3 py-2 text-xs text-neutral-400 truncate">
                {r.url.split("/").pop() ?? r.url}
              </div>
            ) : (
              <input
                type="url"
                value={r.url}
                onChange={(e) => updateResource(i, "url", e.target.value)}
                placeholder="https://..."
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
  publicSurveyStats = [],
  userRole = "admin",
  engagementScores = {},
}: {
  cohorts: CohortRow[];
  students: StudentRow[];
  tracks: AdminTrackConfig[];
  studentTracks: StudentTrackRow[];
  instructorTracks?: InstructorTrackRow[];
  programSlug: string;
  surveyStats: Record<string, SurveyStatsRow[]>;
  surveyConfigs: { id: string; title: string }[];
  publicSurveyStats?: PublicSurveyStatsRow[];
  userRole?: string;
  engagementScores?: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }>;
}) {
  const programSlug = initialProgramSlug;
  const isManager = canManageStudents(userRole);
  // Programs like Catalyst don't have a learner dashboard yet — no tracks,
  // no cohorts, no enrolled students. Show only the Program tab (with
  // Public Surveys) rather than a wall of empty tabs.
  const isDashboardless = tracks.length === 0 && cohorts.length === 0;
  // Build tab list dynamically
  const tabs = isDashboardless
    ? [{ id: "program", label: "Program", icon: Settings }]
    : [
        ...(isManager ? [{ id: "program", label: "Program", icon: Settings }] : []),
        ...tracks.map((t, i) => ({ id: t.slug, label: t.shortName, icon: getTrackIcon(i) })),
        ...(isManager ? [{ id: "students", label: "People", icon: Users }] : []),
        { id: "student-work", label: "Student Work", icon: ClipboardList },
        { id: "attendance", label: "Analytics", icon: UserCheck },
      ];

  const [tab, setTab] = useState<string>(isManager ? "program" : tracks[0]?.slug ?? "student-work");
  const [cohort, setCohort] = useState(cohorts[0] || null);
  const [students, setStudents] = useState(initialStudents);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [studentSaving, setStudentSaving] = useState<string | null>(null);
  const [recentSubs, setRecentSubs] = useState<AdminSubmissionRow[]>([]);
  const [recentRefs, setRecentRefs] = useState<AdminReflectionRow[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);

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

  // Recent activity for the Program tab overview. Fires once the admin lands
  // on Program; cached for the session.
  useEffect(() => {
    if (tab !== "program" || recentLoaded || isDashboardless) return;
    let cancelled = false;
    (async () => {
      try {
        const [subs, refs] = await Promise.all([
          getAllSubmissions(programSlug),
          getAllReflections(programSlug),
        ]);
        if (cancelled) return;
        setRecentSubs(subs);
        setRecentRefs(refs);
      } catch (err) {
        console.error("Failed to load recent activity:", err);
      } finally {
        if (!cancelled) setRecentLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, recentLoaded, isDashboardless, programSlug]);

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

  // ── Cohort save ──────────────────────────────────────────────────────────

  async function saveCohort() {
    if (!cohort) return;
    setSaving(true);
    try {
      await updateCohortAction(cohort.id, {
        display_name: cohort.display_name ?? undefined,
        start_date: cohort.start_date,
        total_weeks: cohort.total_weeks,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save cohort:", e);
    }
    setSaving(false);
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

  // Unified People-tab UI state
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleRoleFilter, setPeopleRoleFilter] = useState<"all" | "student" | "instructor" | "admin">("all");
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

  return (
    <div>
      {/* Horizontal tab bar — single sidebar lives in the dashboard layout.
          On md+ tabs hug their content (no flex-1) and use a thin underline
          treatment so 7-8 tabs don't read as a heavy button cluster. */}
      <div className="mb-6 -mx-1 overflow-x-auto scrollbar-hide md:border-b md:border-neutral-200">
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 md:bg-transparent md:rounded-none md:p-0 md:gap-0">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => { setTab(id); setExpandedWeek(1); }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-medium transition-all whitespace-nowrap rounded-md px-3 py-2.5 md:rounded-none md:px-3 md:py-2.5 md:border-b-2 md:-mb-[2px] ${
                  active
                    ? "bg-white text-neutral-900 shadow-sm md:bg-transparent md:shadow-none md:text-neutral-900 md:border-neutral-900"
                    : "text-neutral-400 hover:text-neutral-600 md:border-transparent md:hover:text-neutral-700"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col">
      <div className="min-w-0 flex-1">
      {/* Dashboardless Program tab — Catalyst etc. */}
      {tab === "program" && isDashboardless && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 text-center">
            <p className="text-sm text-neutral-600">
              This program doesn&apos;t have a full learner dashboard yet.
            </p>
            {canSwitchPrograms(userRole) && (
              <a
                href="/dashboard/admin/insights"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                View all survey insights
              </a>
            )}
          </div>
        </div>
      )}

      {/* Program Tab */}
      {tab === "program" && !isDashboardless && (() => {
        const enrolledCount = students.filter((s) => s.role === "student").length;
        const scoreVals = Object.values(engagementScores);
        const totalAttendance = scoreVals.reduce((a, s) => a + s.attendance, 0);
        const totalSubs = scoreVals.reduce((a, s) => a + s.submissions, 0);
        const totalRefs = scoreVals.reduce((a, s) => a + s.reflections, 0);

        const trackBySlug = Object.fromEntries(tracks.map((t) => [t.slug, t]));
        type ActivityItem = {
          id: string;
          kind: "submission" | "reflection";
          student_name: string;
          track_slug: string;
          week_number: number;
          submitted_at: string;
        };
        const activity: ActivityItem[] = [
          ...recentSubs
            .filter((s) => s.submitted_at)
            .map((s) => ({
              id: `s:${s.id}`,
              kind: "submission" as const,
              student_name: s.student_name,
              track_slug: s.track_slug,
              week_number: s.week_number,
              submitted_at: s.submitted_at!,
            })),
          ...recentRefs
            .filter((r) => r.submitted_at)
            .map((r) => ({
              id: `r:${r.id}`,
              kind: "reflection" as const,
              student_name: r.student_name,
              track_slug: r.track_slug,
              week_number: r.week_number,
              submitted_at: r.submitted_at!,
            })),
        ]
          .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
          .slice(0, 5);

        return (
        <div className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Students", value: enrolledCount },
              { label: "Submissions", value: totalSubs },
              { label: "Reflections", value: totalRefs },
              { label: "Sessions attended", value: totalAttendance },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <p className="text-2xl font-bold text-neutral-900">{m.value}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{m.label}</p>
              </div>
            ))}
          </div>

          {/* This week */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">This week</h2>
            <div className="space-y-2">
              {tracks.map((t) => {
                const currentWeek = computeCurrentWeek(
                  t.startDate,
                  t.totalWeeks,
                  t.lastSessionDayOffset,
                );
                const week = t.weeks.find((w) => w.week === currentWeek);
                const notStarted = new Date(t.startDate).getTime() > Date.now();
                return (
                  <div
                    key={t.slug}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                        {t.shortName}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900">
                        {notStarted
                          ? `Starts ${new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : week
                            ? `Week ${currentWeek}: ${week.title}`
                            : `Week ${currentWeek}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-neutral-500">
                      {t.sessionTimes.join(" · ")}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">Recent activity</h2>
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
              {!recentLoaded ? (
                <p className="p-4 text-sm text-neutral-400">Loading…</p>
              ) : activity.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500">
                  No submissions or reflections yet.
                </p>
              ) : (
                activity.map((item) => {
                  const track = trackBySlug[item.track_slug];
                  const trackLabel = track?.shortName ?? item.track_slug;
                  const submittedAt = new Date(item.submitted_at);
                  const diffMs = Date.now() - submittedAt.getTime();
                  const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
                  const ago =
                    diffHrs < 1
                      ? "just now"
                      : diffHrs < 24
                        ? `${diffHrs}h ago`
                        : `${Math.round(diffHrs / 24)}d ago`;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900">
                          {item.student_name}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {item.kind === "submission"
                            ? "Submitted homework"
                            : "Added reflection"}{" "}
                          — {trackLabel} Week {item.week_number}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-neutral-400">
                        {ago}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Survey Stats */}
          {surveyConfigs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Surveys</h2>
              <div className="space-y-3">
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
              </div>
            </div>
          )}

          {/* Cohort settings — collapsible, demoted from the top */}
          <details className="group rounded-xl border border-neutral-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-semibold text-neutral-900">
              <span>Cohort settings</span>
              <ChevronDown
                size={14}
                className="text-neutral-400 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-4 border-t border-neutral-100 p-4">
              {cohort ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Display Name</label>
                    <input
                      type="text"
                      value={cohort.display_name || ""}
                      onChange={(e) => setCohort({ ...cohort, display_name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500">Start Date</label>
                      <input
                        type="date"
                        value={cohort.start_date}
                        onChange={(e) => setCohort({ ...cohort, start_date: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-500">Total Weeks</label>
                      <input
                        type="number"
                        value={cohort.total_weeks}
                        min={1}
                        onChange={(e) => setCohort({ ...cohort, total_weeks: parseInt(e.target.value) || 1 })}
                        className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={saveCohort}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {saved ? <><Check size={14} /> Saved</> : saving ? "Saving..." : <><Save size={14} /> Save Changes</>}
                  </button>
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  No cohort has been created yet for this program. A cohort is seeded automatically when the first student enrolls.
                </p>
              )}
            </div>
          </details>

        </div>
        );
      })()}

      {/* Dynamic Track Tabs */}
      {activeTrack && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-neutral-900">{activeTrack.name}</h2>
            <p className="text-xs text-neutral-400">
              {activeTrack.totalWeeks} week{activeTrack.totalWeeks !== 1 ? "s" : ""} · {activeTrack.sessionTimes.join(" & ")}
            </p>
          </div>
          {activeWeeks.map((aw) => {
            const hasMultipleSessions = aw.sessions.length > 1;
            return (
              <div key={aw.week} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(expandedWeek === aw.week ? null : aw.week)}
                  className="flex w-full items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{aw.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-neutral-900">
                        Week {aw.week}: {aw.title}
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
                            className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-500">Subtitle</label>
                          <input
                            type="text"
                            value={aw.overrideSubtitle}
                            onChange={(e) => updateWeekOverride(activeTrack.slug, aw.week, { overrideSubtitle: e.target.value })}
                            placeholder="e.g. Industry Perspectives"
                            className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none"
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
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none resize-none"
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
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none resize-none"
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
                            className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
                              className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
                        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
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

      {/* People Tab — unified roster + track enrollment management */}
      {tab === "students" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-neutral-900">People</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {students.length} total · {enrollments.length} track assignment{enrollments.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tracks.length > 0 && (
                <button
                  onClick={() => setShowBulkAssign((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    showBulkAssign
                      ? "bg-neutral-100 text-neutral-900 border border-neutral-300"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <BookOpen size={12} />
                  Bulk assign
                </button>
              )}
              <button
                onClick={() => { setShowAddForm(!showAddForm); setAddError(""); }}
                className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                <UserPlus size={12} />
                Add
              </button>
            </div>
          </div>

          {showAddForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddingStudent(true);
                setAddError("");
                const form = e.currentTarget;
                const formData = new FormData(form);
                try {
                  const result = await addStudentAction({
                    email: String(formData.get("email")),
                    first_name: String(formData.get("first_name")),
                    last_name: String(formData.get("last_name")),
                    role: String(formData.get("role")) as "student" | "admin",
                    cohort_id: String(formData.get("cohort_id")) || null,
                  });
                  if (result.student) {
                    setStudents((prev) => [...prev, result.student]);
                    form.reset();
                    setShowAddForm(false);
                  }
                } catch (err) {
                  setAddError(err instanceof Error ? err.message : "Failed to add student");
                } finally {
                  setAddingStudent(false);
                }
              }}
              className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500">First Name</label>
                  <input name="first_name" required className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Last Name</label>
                  <input name="last_name" required className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Email</label>
                <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Role</label>
                  <select name="role" defaultValue="student" className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Cohort</label>
                  <select name="cohort_id" defaultValue={cohorts[0]?.id ?? ""} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
                    <option value="">No cohort</option>
                    {cohorts.map((co) => (
                      <option key={co.id} value={co.id}>{co.display_name || co.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                  {addingStudent ? "Adding..." : <><Plus size={14} /> Add</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Bulk-assign drawer (collapsible) */}
          {showBulkAssign && tracks.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-700">Bulk assign to track</p>
                <button
                  onClick={() => setShowBulkAssign(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                  aria-label="Close bulk assign"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={bulkTrack}
                    onChange={(e) => setBulkTrack(e.target.value)}
                    className="appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
                  >
                    {tracks.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.shortName}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
                <button
                  onClick={handleBulkAssign}
                  disabled={bulkSaving || bulkSelected.size === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                  {bulkSaving ? "Assigning..." : `Assign ${bulkSelected.size} selected`}
                </button>
                {bulkSelected.size > 0 && (
                  <button
                    onClick={() => setBulkSelected(new Set())}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border-t border-neutral-100 pt-2">
                {students.filter((s) => s.role !== "admin" && s.role !== "super_admin").map((student) => {
                  const alreadyEnrolled = enrollments.some(
                    (e) => e.student_id === student.id && e.track_slug === bulkTrack
                  );
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:bg-neutral-50 ${
                        alreadyEnrolled ? "opacity-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={alreadyEnrolled}
                        checked={bulkSelected.has(student.id)}
                        onChange={(e) => {
                          const next = new Set(bulkSelected);
                          if (e.target.checked) next.add(student.id);
                          else next.delete(student.id);
                          setBulkSelected(next);
                        }}
                        className="rounded border-neutral-300"
                      />
                      <span className="text-neutral-700">
                        {student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email}
                      </span>
                      {alreadyEnrolled && (
                        <span className="text-[10px] text-neutral-400 ml-auto">Already enrolled</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search + filters */}
          {students.length > 0 && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search by name or email…"
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-neutral-500 mr-1">Role:</span>
                {(["all", "student", "instructor", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setPeopleRoleFilter(r)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors capitalize ${
                      peopleRoleFilter === r ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {r === "all" ? "All" : `${r}s`}
                  </button>
                ))}
                {tracks.length > 0 && (
                  <>
                    <span className="text-[11px] text-neutral-500 ml-3 mr-1">Track:</span>
                    <button
                      onClick={() => setEnrollmentFilter("all")}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        enrollmentFilter === "all" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      All
                    </button>
                    {tracks.map((t) => (
                      <button
                        key={t.slug}
                        onClick={() => setEnrollmentFilter(t.slug)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          enrollmentFilter === t.slug ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {t.shortName}
                      </button>
                    ))}
                    <button
                      onClick={() => setEnrollmentFilter("none")}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        enrollmentFilter === "none" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      Unassigned
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {students.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">No people yet</p>
          )}
          {students
            .filter((s) => {
              // Role filter (admin tab includes super_admin)
              if (peopleRoleFilter !== "all") {
                if (peopleRoleFilter === "admin") {
                  if (s.role !== "admin" && s.role !== "super_admin") return false;
                } else if (s.role !== peopleRoleFilter) return false;
              }
              // Track filter — only applies to people who can be on a track
              if (enrollmentFilter !== "all" && tracks.length > 0) {
                const isInstr = s.role === "instructor";
                if (!isInstr && s.role !== "student") return false;
                const t = isInstr ? getInstructorAssignments(s.id) : getStudentEnrollments(s.id);
                if (enrollmentFilter === "none") {
                  if (t.length > 0) return false;
                } else if (!t.includes(enrollmentFilter)) {
                  return false;
                }
              }
              // Search
              const q = peopleSearch.trim().toLowerCase();
              if (q) {
                const hay = `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase();
                if (!hay.includes(q)) return false;
              }
              return true;
            })
            .map((student) => {
            const score = engagementScores[student.id];
            const scoreColor = !score || student.role !== "student"
              ? ""
              : score.total >= 60 ? "bg-green-500" : score.total >= 30 ? "bg-amber-500" : "bg-red-500";
            const isInstructor = student.role === "instructor";
            const isStudent = student.role === "student";
            const personTracks = isInstructor
              ? getInstructorAssignments(student.id)
              : getStudentEnrollments(student.id);
            const canEnroll = (isStudent || isInstructor) && tracks.length > 0;
            return (
            <div
              key={student.id}
              className={`rounded-xl border border-neutral-200 bg-white p-4 transition-opacity ${
                studentSaving === student.id ? "opacity-50" : ""
              }`}
            >
              {/* Name row */}
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {scoreColor && (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${scoreColor}`} title={`Engagement: ${score?.total ?? 0}/100`} />
                    )}
                    <p className="text-sm font-semibold text-neutral-900">
                      {student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email}
                    </p>
                    {student.role === "super_admin" && (
                      <Shield size={12} className="shrink-0 text-red-500" />
                    )}
                    {student.role === "admin" && (
                      <Shield size={12} className="shrink-0 text-amber-500" />
                    )}
                    {student.role === "instructor" && (
                      <GraduationCap size={12} className="shrink-0 text-blue-500" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{student.email}</p>
                </div>
                {confirmDelete === student.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => deleteStudent(student.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(student.id)}
                    className="shrink-0 rounded-lg border border-neutral-200 p-2 text-neutral-400 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Delete person"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {/* Controls row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={student.role}
                    onChange={(e) => updateStudent(student.id, "role", e.target.value)}
                    disabled={student.role === "super_admin"}
                    className="w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
                <div className="relative flex-[2]">
                  <select
                    value={student.cohort_id || ""}
                    onChange={(e) => updateStudent(student.id, "cohort_id", e.target.value)}
                    className="w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none truncate"
                  >
                    <option value="">No cohort</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
              {/* Track chips — students enroll, instructors teach */}
              {canEnroll && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mr-0.5">
                    {isInstructor ? "Teaches" : "Tracks"}
                  </span>
                  {tracks.map((t) => {
                    const isOn = personTracks.includes(t.slug);
                    const isSaving = isInstructor
                      ? instrTrackSaving === `${student.id}-${t.slug}`
                      : enrollmentSaving === `${student.id}-${t.slug}`;
                    return (
                      <button
                        key={t.slug}
                        onClick={() =>
                          isInstructor
                            ? toggleInstructorTrack(student.id, t.slug)
                            : toggleTrackEnrollment(student.id, t.slug)
                        }
                        disabled={isSaving}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                          isOn
                            ? isInstructor
                              ? "bg-blue-600 text-white hover:bg-red-600"
                              : "bg-neutral-900 text-white hover:bg-red-600"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        } ${isSaving ? "opacity-50" : ""}`}
                        title={isOn ? `Remove from ${t.shortName}` : `Add to ${t.shortName}`}
                      >
                        {isSaving ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : isOn ? (
                          <Check size={10} />
                        ) : (
                          <Plus size={10} />
                        )}
                        {t.shortName}
                      </button>
                    );
                  })}
                  {isStudent && personTracks.length === 0 && (
                    <span className="text-[10px] text-neutral-400 ml-1">Sees all tracks</span>
                  )}
                </div>
              )}
              {score && student.role === "student" && (
                <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
                  <span>{score.attendance} sessions</span>
                  <span>{score.submissions} submissions</span>
                  <span>{score.reflections} reflections</span>
                  <span>{score.tutorMessages} tutor msgs</span>
                </div>
              )}
            </div>
          );
          })}

          {/* Enrollment links (collapsible footer) */}
          {tracks.length > 0 && (
            <details className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 mt-4">
              <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-neutral-700 select-none flex items-center justify-between">
                <span>Enrollment links</span>
                <LinkIcon size={12} className="text-neutral-400" />
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-[11px] text-neutral-500">
                  Share these with students. Signing in through a link auto-enrolls them in that track.
                </p>
                {tracks.map((t) => {
                  const domain = typeof window !== "undefined" ? window.location.origin : "";
                  const link = `${domain}/?track=${t.slug}`;
                  return (
                    <div key={t.slug} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-600 w-28 shrink-0">{t.shortName}:</span>
                      <code className="flex-1 text-[11px] text-neutral-500 bg-white rounded px-2 py-1 border border-neutral-200 truncate">
                        {link}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(link)}
                        className="shrink-0 rounded-md border border-neutral-200 p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-white transition-colors"
                        title="Copy link"
                      >
                        <LinkIcon size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}


      {/* Student Work Tab */}
      {tab === "student-work" && (
        <StudentWorkTab tracks={tracks} programSlug={programSlug} />
      )}

      {/* Attendance Tab */}
      {tab === "attendance" && (
        <AttendanceTab students={students.filter((s) => s.role === "student")} />
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
        <div className="flex rounded-lg bg-neutral-100 p-0.5">
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
            className="appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
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
            className="appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
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
            <div key={sub.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
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
                        className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
                        className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
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
            <div key={ref.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
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
                        className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
                        className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
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
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
        {localResponses.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
            {clearingAll ? "Deleting..." : "Delete All"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
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
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50">
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
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
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
        {responseCount > 0 && (
          <button
            type="button"
            onClick={handleExpand}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
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
            <div key={r.email} className="rounded-lg border border-neutral-100 overflow-hidden">
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
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
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
