"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { deleteStudentAction, updateStudentAction, updateCohortAction, saveSessionContent } from "./actions";
import type { SessionResource } from "./actions";
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
  Plus,
  X,
  Link as LinkIcon,
} from "lucide-react";
import { AttendanceTab } from "./attendance-tab";
import type { Student } from "@/lib/types";

type CohortRow = {
  id: string;
  name: string;
  display_name: string | null;
  start_date: string;
  total_weeks: number;
};

type StudentRow = Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">;

// Loaded from the API — maps week_number to content
type SessionContentMap = Record<number, {
  meeting_link: string;
  recording_url: string;
  resources: SessionResource[];
}>;

type MassWeek = {
  week: number;
  title: string;
  icon: string;
  meetingLink: string;
  recordingUrl: string;
  resources: SessionResource[];
  status: "upcoming" | "completed";
};

type TechWeek = {
  week: number;
  title: string;
  icon: string;
  sessions: { num: number; title: string; meetingLink: string; recordingUrl: string; resources: SessionResource[]; status: "upcoming" | "completed" }[];
};

const TABS = [
  { id: "program", label: "Program", icon: Settings },
  { id: "mass", label: "MASS", icon: GraduationCap },
  { id: "techplus", label: "Tech+", icon: BookOpen },
  { id: "students", label: "Students", icon: Users },
  { id: "attendance", label: "Attendance", icon: UserCheck },
] as const;

const INITIAL_MASS: MassWeek[] = [
  { week: 1, title: "Storytelling for Career Success", icon: "🎙️", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 2, title: "Networking", icon: "🤝", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 3, title: "The Art of the Brag", icon: "💪", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 4, title: "Guest Speaker", icon: "🎤", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 5, title: "Planning", icon: "📋", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 6, title: "Guest Speaker", icon: "🎤", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 7, title: "Money & Financial Confidence", icon: "💰", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  { week: 8, title: "Career Expo", icon: "🎯", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
];

const INITIAL_TECH: TechWeek[] = [
  { week: 1, title: "IT Concepts & Careers", icon: "💻", sessions: [
    { num: 1, title: "IT Concepts & Career Pathways", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Devices & Getting Started", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 2, title: "Hardware Components", icon: "🔧", sessions: [
    { num: 1, title: "Internal Hardware Components", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Peripherals & Connections", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 3, title: "Setup & Troubleshooting", icon: "🛠️", sessions: [
    { num: 1, title: "Device Setup & Ports", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Troubleshooting Lab", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 4, title: "Operating Systems", icon: "📀", sessions: [
    { num: 1, title: "Operating Systems Overview", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Software Management", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 5, title: "Networking Basics", icon: "🌐", sessions: [
    { num: 1, title: "Network Foundations", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "IP Concepts & Diagnostics", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 6, title: "Security & Threats", icon: "🔒", sessions: [
    { num: 1, title: "Security Principles", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Threats & Defense", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 7, title: "Data & Databases", icon: "📊", sessions: [
    { num: 1, title: "Database Fundamentals", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Data Management Lab", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
  { week: 8, title: "Review & Exam Prep", icon: "🎯", sessions: [
    { num: 1, title: "Comprehensive Review", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
    { num: 2, title: "Practice Exam & Study Plan", meetingLink: "", recordingUrl: "", resources: [], status: "upcoming" },
  ] },
];

// ─── Resource Editor ──────────────────────────────────────────────────────────

function ResourceEditor({
  resources,
  onChange,
}: {
  resources: SessionResource[];
  onChange: (updated: SessionResource[]) => void;
}) {
  function addResource() {
    onChange([...resources, { name: "", url: "", type: "link" }]);
  }

  function updateResource(index: number, field: keyof SessionResource, value: string) {
    onChange(resources.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeResource(index: number) {
    onChange(resources.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-500">Resources</label>
        <button
          type="button"
          onClick={addResource}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <Plus size={11} />
          Add Resource
        </button>
      </div>
      {resources.length === 0 && (
        <p className="text-[11px] text-neutral-400 pl-0.5">No resources yet</p>
      )}
      {resources.map((r, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={r.name}
              onChange={(e) => updateResource(i, "name", e.target.value)}
              placeholder="Resource name"
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
            <input
              type="url"
              value={r.url}
              onChange={(e) => updateResource(i, "url", e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => removeResource(i)}
            className="mt-2 text-neutral-300 hover:text-red-400 transition-colors"
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminTabs({
  cohorts,
  students: initialStudents,
}: {
  cohorts: CohortRow[];
  students: StudentRow[];
}) {
  const [tab, setTab] = useState<string>("program");
  const [cohort, setCohort] = useState(cohorts[0] || null);
  const [students, setStudents] = useState(initialStudents);
  const [massWeeks, setMassWeeks] = useState(INITIAL_MASS);
  const [techWeeks, setTechWeeks] = useState(INITIAL_TECH);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [studentSaving, setStudentSaving] = useState<string | null>(null);

  // Per-week save state maps: key is week number
  const [massSaveState, setMassSaveState] = useState<Record<number, SaveState>>({});
  const [techSaveState, setTechSaveState] = useState<Record<number, SaveState>>({});

  // Debounce refs so we can cancel pending saves
  const massSaveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const techSaveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Load initial session content from the API
  useEffect(() => {
    async function loadContent(track: "mass" | "techplus") {
      try {
        const res = await fetch(`/api/session-content?track=${track}`);
        if (!res.ok) return;
        const json = await res.json() as { rows: Array<{
          week_number: number;
          meeting_link: string | null;
          recording_url: string | null;
          resources: SessionResource[];
        }> };
        const map: SessionContentMap = {};
        for (const row of json.rows) {
          map[row.week_number] = {
            meeting_link: row.meeting_link ?? "",
            recording_url: row.recording_url ?? "",
            resources: row.resources ?? [],
          };
        }
        if (track === "mass") {
          setMassWeeks((prev) =>
            prev.map((w) =>
              map[w.week]
                ? {
                    ...w,
                    meetingLink: map[w.week].meeting_link,
                    recordingUrl: map[w.week].recording_url,
                    resources: map[w.week].resources,
                  }
                : w
            )
          );
        } else {
          setTechWeeks((prev) =>
            prev.map((tw) =>
              map[tw.week]
                ? {
                    ...tw,
                    sessions: tw.sessions.map((s, i) => ({
                      ...s,
                      meetingLink: i === 0 ? map[tw.week].meeting_link : s.meetingLink,
                      recordingUrl: i === 0 ? map[tw.week].recording_url : s.recordingUrl,
                      resources: i === 0 ? map[tw.week].resources : s.resources,
                    })),
                  }
                : tw
            )
          );
        }
      } catch {
        // API unavailable (e.g., Supabase not configured) — silently no-op
      }
    }
    loadContent("mass");
    loadContent("techplus");
  }, []);

  // ── Debounced MASS save ──────────────────────────────────────────────────

  const scheduleMassSave = useCallback((weekNum: number, data: MassWeek) => {
    clearTimeout(massSaveTimers.current[weekNum]);
    setMassSaveState((s) => ({ ...s, [weekNum]: "saving" }));
    massSaveTimers.current[weekNum] = setTimeout(async () => {
      try {
        await saveSessionContent("mass", weekNum, {
          meeting_link: data.meetingLink,
          recording_url: data.recordingUrl,
          resources: data.resources,
        });
        setMassSaveState((s) => ({ ...s, [weekNum]: "saved" }));
        setTimeout(() => setMassSaveState((s) => ({ ...s, [weekNum]: "idle" })), 2000);
      } catch {
        setMassSaveState((s) => ({ ...s, [weekNum]: "error" }));
      }
    }, 800);
  }, []);

  function updateMassWeek(weekNum: number, patch: Partial<MassWeek>) {
    setMassWeeks((prev) => {
      const updated = prev.map((w) => (w.week === weekNum ? { ...w, ...patch } : w));
      const week = updated.find((w) => w.week === weekNum)!;
      scheduleMassSave(weekNum, week);
      return updated;
    });
  }

  // ── Debounced Tech+ save ─────────────────────────────────────────────────
  // For Tech+, we store per-week (not per-session) in session_content.
  // Session 1 fields are the canonical record; session 2 resources are merged.

  const scheduleTechSave = useCallback((weekNum: number, data: TechWeek) => {
    clearTimeout(techSaveTimers.current[weekNum]);
    setTechSaveState((s) => ({ ...s, [weekNum]: "saving" }));
    techSaveTimers.current[weekNum] = setTimeout(async () => {
      try {
        // Merge all session resources together for the week record
        const allResources = data.sessions.flatMap((s) => s.resources);
        await saveSessionContent("techplus", weekNum, {
          meeting_link: data.sessions[0]?.meetingLink ?? "",
          recording_url: data.sessions[0]?.recordingUrl ?? "",
          resources: allResources,
        });
        setTechSaveState((s) => ({ ...s, [weekNum]: "saved" }));
        setTimeout(() => setTechSaveState((s) => ({ ...s, [weekNum]: "idle" })), 2000);
      } catch {
        setTechSaveState((s) => ({ ...s, [weekNum]: "error" }));
      }
    }, 800);
  }, []);

  function updateTechSession(weekNum: number, sessionNum: number, patch: Partial<TechWeek["sessions"][0]>) {
    setTechWeeks((prev) => {
      const updated = prev.map((w) =>
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
      scheduleTechSave(weekNum, week);
      return updated;
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

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setExpandedWeek(1); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 min-h-[44px] text-xs font-medium transition-all ${
              tab === id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Program Tab */}
      {tab === "program" && cohort && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Cohort Settings</h2>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-500">Display Name</label>
                <input
                  type="text"
                  value={cohort.display_name || ""}
                  onChange={(e) => setCohort({ ...cohort, display_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  placeholder="e.g. Cohort 1 — CompTIA Tech+ Foundations, MASS Training & AI Fundamentals"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {saved ? <><Check size={14} /> Saved</> : saving ? "Saving..." : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Quick Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{students.length}</p>
                <p className="text-xs text-neutral-400">Students</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{massWeeks.length}</p>
                <p className="text-xs text-neutral-400">MASS Weeks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{techWeeks.length}</p>
                <p className="text-xs text-neutral-400">Tech+ Weeks</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASS Tab */}
      {tab === "mass" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-neutral-900">MASS Wraparound</h2>
            <p className="text-xs text-neutral-400">8 weeks · with Angel Aviles</p>
          </div>
          {massWeeks.map((mw) => (
            <div key={mw.week} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === mw.week ? null : mw.week)}
                className="flex w-full items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{mw.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900">
                      Week {mw.week}: {mw.title}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {mw.status === "completed" ? "Completed" : "Upcoming"}
                      {mw.meetingLink && " · Meet link set"}
                      {mw.recordingUrl && " · Recording set"}
                      {mw.resources.length > 0 && ` · ${mw.resources.length} resource${mw.resources.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SaveIndicator state={massSaveState[mw.week] ?? "idle"} />
                  <span className={`h-2 w-2 rounded-full ${mw.status === "completed" ? "bg-green-500" : "bg-neutral-300"}`} />
                  <ChevronDown size={16} className={`text-neutral-400 transition-transform ${expandedWeek === mw.week ? "rotate-180" : ""}`} />
                </div>
              </button>
              {expandedWeek === mw.week && (
                <div className="border-t border-neutral-100 px-4 sm:px-5 py-3.5 sm:py-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Google Meet Link</label>
                    <input
                      type="url"
                      value={mw.meetingLink}
                      onChange={(e) => updateMassWeek(mw.week, { meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Recording URL (after session)</label>
                    <input
                      type="url"
                      value={mw.recordingUrl}
                      onChange={(e) => updateMassWeek(mw.week, { recordingUrl: e.target.value })}
                      placeholder="https://youtube.com/... or https://drive.google.com/..."
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  {/* Resources section */}
                  <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 space-y-3">
                    <ResourceEditor
                      resources={mw.resources}
                      onChange={(updated) => updateMassWeek(mw.week, { resources: updated })}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mw.status === "completed"}
                        onChange={(e) => updateMassWeek(mw.week, { status: e.target.checked ? "completed" : "upcoming" })}
                        className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                      />
                      <span className="text-sm text-neutral-700">Mark as completed</span>
                    </label>
                    {mw.meetingLink && (
                      <a href={mw.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-900">
                        Open Meet <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tech+ Tab */}
      {tab === "techplus" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-neutral-900">CompTIA Tech+ Foundations</h2>
            <p className="text-xs text-neutral-400">8 weeks · Wed & Fri</p>
          </div>
          {techWeeks.map((tw) => (
            <div key={tw.week} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === tw.week ? null : tw.week)}
                className="flex w-full items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tw.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900">
                      Week {tw.week}: {tw.title}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {tw.sessions.length} sessions
                      {tw.sessions.some((s) => s.recordingUrl) && " · Recording set"}
                      {tw.sessions.some((s) => s.resources.length > 0) && " · Has resources"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SaveIndicator state={techSaveState[tw.week] ?? "idle"} />
                  <ChevronDown size={16} className={`text-neutral-400 transition-transform ${expandedWeek === tw.week ? "rotate-180" : ""}`} />
                </div>
              </button>
              {expandedWeek === tw.week && (
                <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                  {tw.sessions.map((s) => (
                    <div key={s.num} className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        Session {s.num}: {s.title}
                      </p>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Google Meet Link</label>
                        <input
                          type="url"
                          value={s.meetingLink}
                          onChange={(e) => updateTechSession(tw.week, s.num, { meetingLink: e.target.value })}
                          placeholder="https://meet.google.com/..."
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Recording URL</label>
                        <input
                          type="url"
                          value={s.recordingUrl}
                          onChange={(e) => updateTechSession(tw.week, s.num, { recordingUrl: e.target.value })}
                          placeholder="https://youtube.com/... or https://drive.google.com/..."
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                        />
                      </div>

                      {/* Resources per session */}
                      <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                        <ResourceEditor
                          resources={s.resources}
                          onChange={(updated) => updateTechSession(tw.week, s.num, { resources: updated })}
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.status === "completed"}
                          onChange={(e) => updateTechSession(tw.week, s.num, { status: e.target.checked ? "completed" : "upcoming" })}
                          className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                        />
                        <span className="text-sm text-neutral-700">Mark as completed</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Students Tab */}
      {tab === "students" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-neutral-900">Students</h2>
            <p className="text-xs text-neutral-400">{students.length} total</p>
          </div>
          {students.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">No students yet</p>
          )}
          {students.map((student) => (
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
                    <p className="text-sm font-semibold text-neutral-900">
                      {student.first_name} {student.last_name}
                    </p>
                    {student.role === "admin" && (
                      <Shield size={12} className="shrink-0 text-amber-500" />
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
                    title="Delete student"
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
                    className="w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
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
            </div>
          ))}
        </div>
      )}

      {/* Attendance Tab */}
      {tab === "attendance" && (
        <AttendanceTab students={students} />
      )}
    </div>
  );
}
