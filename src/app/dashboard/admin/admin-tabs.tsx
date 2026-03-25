"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Trash2,
} from "lucide-react";
import type { Student } from "@/lib/types";

type CohortRow = {
  id: string;
  name: string;
  display_name: string | null;
  start_date: string;
  total_weeks: number;
};

type StudentRow = Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">;

type MassWeek = {
  week: number;
  title: string;
  icon: string;
  meetingLink: string;
  recordingUrl: string;
  status: "upcoming" | "completed";
};

type TechWeek = {
  week: number;
  title: string;
  icon: string;
  sessions: { num: number; title: string; meetingLink: string; recordingUrl: string; status: "upcoming" | "completed" }[];
};

const TABS = [
  { id: "program", label: "Program", icon: Settings },
  { id: "mass", label: "MASS", icon: GraduationCap },
  { id: "techplus", label: "Tech+", icon: BookOpen },
  { id: "students", label: "Students", icon: Users },
] as const;

const INITIAL_MASS: MassWeek[] = [
  { week: 1, title: "Storytelling for Career Success", icon: "🎙️", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 2, title: "Networking", icon: "🤝", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 3, title: "The Art of the Brag", icon: "💪", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 4, title: "Guest Speaker", icon: "🎤", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 5, title: "Planning", icon: "📋", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 6, title: "Guest Speaker", icon: "🎤", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 7, title: "Money & Financial Confidence", icon: "💰", meetingLink: "", recordingUrl: "", status: "upcoming" },
  { week: 8, title: "Career Expo", icon: "🎯", meetingLink: "", recordingUrl: "", status: "upcoming" },
];

const INITIAL_TECH: TechWeek[] = [
  { week: 1, title: "IT Fundamentals", icon: "💻", sessions: [
    { num: 1, title: "Course Introduction", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "IT Fundamentals Overview", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
  { week: 2, title: "Devices & OS", icon: "🖥️", sessions: [
    { num: 1, title: "Device Configuration", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "Operating Systems", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
  { week: 3, title: "Networking", icon: "🌐", sessions: [
    { num: 1, title: "Networking Basics", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "TCP/IP & DNS", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
  { week: 4, title: "Cybersecurity", icon: "🔒", sessions: [
    { num: 1, title: "Security Principles", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "Threat Landscape", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
  { week: 5, title: "Software & Data", icon: "🗄️", sessions: [
    { num: 1, title: "Software Dev Basics", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "Database Fundamentals", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
  { week: 6, title: "Cloud & Support", icon: "☁️", sessions: [
    { num: 1, title: "Cloud Concepts", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "IT Support Workflows", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
  { week: 7, title: "Cert Review", icon: "🏆", sessions: [
    { num: 1, title: "Certification Review", meetingLink: "", recordingUrl: "", status: "upcoming" },
    { num: 2, title: "Final Assessment", meetingLink: "", recordingUrl: "", status: "upcoming" },
  ]},
];

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

  async function saveCohort() {
    if (!cohort) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("cohorts").update({
      display_name: cohort.display_name,
      start_date: cohort.start_date,
      total_weeks: cohort.total_weeks,
    }).eq("id", cohort.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function updateStudent(id: string, field: "role" | "cohort_id", value: string) {
    setStudentSaving(id);
    const supabase = createClient();
    await supabase.from("students").update({ [field]: value }).eq("id", id);
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    setStudentSaving(null);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setExpandedWeek(1); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-xs font-medium transition-all ${
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
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Quick Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{students.length}</p>
                <p className="text-xs text-neutral-400">Students</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{INITIAL_MASS.length}</p>
                <p className="text-xs text-neutral-400">MASS Weeks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{INITIAL_TECH.length}</p>
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
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
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
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${mw.status === "completed" ? "bg-green-500" : "bg-neutral-300"}`} />
                  <ChevronDown size={16} className={`text-neutral-400 transition-transform ${expandedWeek === mw.week ? "rotate-180" : ""}`} />
                </div>
              </button>
              {expandedWeek === mw.week && (
                <div className="border-t border-neutral-100 px-5 py-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Google Meet Link</label>
                    <input
                      type="url"
                      value={mw.meetingLink}
                      onChange={(e) => setMassWeeks(prev => prev.map(w => w.week === mw.week ? { ...w, meetingLink: e.target.value } : w))}
                      placeholder="https://meet.google.com/..."
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Recording URL (after session)</label>
                    <input
                      type="url"
                      value={mw.recordingUrl}
                      onChange={(e) => setMassWeeks(prev => prev.map(w => w.week === mw.week ? { ...w, recordingUrl: e.target.value } : w))}
                      placeholder="https://drive.google.com/..."
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mw.status === "completed"}
                        onChange={(e) => setMassWeeks(prev => prev.map(w => w.week === mw.week ? { ...w, status: e.target.checked ? "completed" : "upcoming" } : w))}
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
            <p className="text-xs text-neutral-400">7 weeks · Wed & Fri</p>
          </div>
          {techWeeks.map((tw) => (
            <div key={tw.week} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === tw.week ? null : tw.week)}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tw.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900">
                      Week {tw.week}: {tw.title}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {tw.sessions.length} sessions
                    </p>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-neutral-400 transition-transform ${expandedWeek === tw.week ? "rotate-180" : ""}`} />
              </button>
              {expandedWeek === tw.week && (
                <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                  {tw.sessions.map((s) => (
                    <div key={s.num} className="px-5 py-4 space-y-3">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        Session {s.num}: {s.title}
                      </p>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Google Meet Link</label>
                        <input
                          type="url"
                          value={s.meetingLink}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTechWeeks(prev => prev.map(w => w.week === tw.week ? {
                              ...w,
                              sessions: w.sessions.map(sess => sess.num === s.num ? { ...sess, meetingLink: val } : sess)
                            } : w));
                          }}
                          placeholder="https://meet.google.com/..."
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Recording URL</label>
                        <input
                          type="url"
                          value={s.recordingUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTechWeeks(prev => prev.map(w => w.week === tw.week ? {
                              ...w,
                              sessions: w.sessions.map(sess => sess.num === s.num ? { ...sess, recordingUrl: val } : sess)
                            } : w));
                          }}
                          placeholder="https://drive.google.com/..."
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.status === "completed"}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setTechWeeks(prev => prev.map(w => w.week === tw.week ? {
                              ...w,
                              sessions: w.sessions.map(sess => sess.num === s.num ? { ...sess, status: checked ? "completed" : "upcoming" } : sess)
                            } : w));
                          }}
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
              className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-opacity ${
                studentSaving === student.id ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {student.first_name} {student.last_name}
                  </p>
                  {student.role === "admin" && (
                    <Shield size={12} className="shrink-0 text-amber-500" />
                  )}
                </div>
                <p className="text-xs text-neutral-400 truncate">{student.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={student.role}
                    onChange={(e) => updateStudent(student.id, "role", e.target.value)}
                    className="appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
                <div className="relative">
                  <select
                    value={student.cohort_id || ""}
                    onChange={(e) => updateStudent(student.id, "cohort_id", e.target.value)}
                    className="appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
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
    </div>
  );
}
