"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  UserCheck,
  Users,
  CheckCircle2,
  Circle,
  RefreshCw,
  ChevronDown,
  Download,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Video,
  FileText,
} from "lucide-react";
import type { ProgressRecord } from "@/app/api/week-progress/route";

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  track: string;
  week_number: number;
  session_number: number;
  checked_in_at: string;
  marked_by: string | null;
};

type AttendanceTabProps = {
  students: StudentRow[];
};

const MASS_WEEKS = 8;
const TECH_WEEKS = 8;
const TECH_SESSIONS_PER_WEEK = 2;

function buildWeekKey(track: string, week: number, session: number) {
  return `${track}-w${week}-s${session}`;
}

type StudentRisk = {
  student: StudentRow;
  massRate: number;
  techRate: number;
  combinedRate: number;
  consecutiveMisses: number;
  completionRate: number;
  engagementScore: number;
  status: "on-track" | "at-risk" | "disengaged";
};

function computeStudentRisks(
  students: StudentRow[],
  massRecords: AttendanceRecord[],
  techRecords: AttendanceRecord[],
  progressRecords: ProgressRecord[],
  massWeeksElapsed: number,
  techWeeksElapsed: number
): StudentRisk[] {
  return students.map((student) => {
    const massAttended = massRecords.filter((r) => r.student_id === student.id).length;
    const techAttended = techRecords.filter((r) => r.student_id === student.id).length;

    const massPossible = massWeeksElapsed;
    const techPossible = techWeeksElapsed * TECH_SESSIONS_PER_WEEK;

    const massRate = massPossible > 0 ? Math.round((massAttended / massPossible) * 100) : 100;
    const techRate = techPossible > 0 ? Math.round((techAttended / techPossible) * 100) : 100;

    const totalPossible = massPossible + techPossible;
    const totalAttended = massAttended + techAttended;
    const combinedRate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 100;

    // Consecutive misses (most recent sessions first)
    let consecutiveMisses = 0;
    const allSessions: { track: string; week: number; session: number }[] = [];
    for (let w = massWeeksElapsed; w >= 1; w--) {
      allSessions.push({ track: "mass", week: w, session: 1 });
    }
    for (let w = techWeeksElapsed; w >= 1; w--) {
      allSessions.push({ track: "techplus", week: w, session: 2 });
      allSessions.push({ track: "techplus", week: w, session: 1 });
    }
    allSessions.sort((a, b) => b.week - a.week || b.session - a.session);

    const allRecords = [...massRecords, ...techRecords];
    for (const s of allSessions) {
      const attended = allRecords.some(
        (r) =>
          r.student_id === student.id &&
          r.track === s.track &&
          r.week_number === s.week &&
          r.session_number === s.session
      );
      if (attended) break;
      consecutiveMisses++;
    }

    // Completion rate: % of elapsed weeks with both video + homework done
    const possibleCompletions = massWeeksElapsed + techWeeksElapsed;
    let completedWeeks = 0;
    for (let w = 1; w <= massWeeksElapsed; w++) {
      const pr = progressRecords.find(
        (r) => r.student_id === student.id && r.track_slug === "mass" && r.week_number === w
      );
      if (pr?.video_watched && pr?.homework_submitted) completedWeeks++;
    }
    for (let w = 1; w <= techWeeksElapsed; w++) {
      const pr = progressRecords.find(
        (r) => r.student_id === student.id && r.track_slug === "techplus" && r.week_number === w
      );
      if (pr?.video_watched && pr?.homework_submitted) completedWeeks++;
    }
    const completionRate = possibleCompletions > 0 ? Math.round((completedWeeks / possibleCompletions) * 100) : 100;

    const engagementScore = Math.round(0.5 * combinedRate + 0.5 * completionRate);

    let status: StudentRisk["status"] = "on-track";
    if (engagementScore < 50) status = "disengaged";
    else if (engagementScore < 80) status = "at-risk";

    return { student, massRate, techRate, combinedRate, consecutiveMisses, completionRate, engagementScore, status };
  });
}

function exportCSV(risks: StudentRisk[]) {
  const header = "Name,Email,MASS %,Tech+ %,Combined %,Completion %,Engagement Score,Status,Consecutive Misses";
  const rows = risks.map((r) =>
    [
      `"${r.student.first_name && r.student.last_name ? `${r.student.first_name} ${r.student.last_name}` : r.student.email}"`,
      r.student.email,
      r.massRate,
      r.techRate,
      r.combinedRate,
      r.completionRate,
      r.engagementScore,
      r.status === "on-track" ? "On Track" : r.status === "at-risk" ? "At Risk" : "Disengaged",
      r.consecutiveMisses,
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atg-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_STYLES = {
  "on-track": { bg: "bg-green-50", text: "text-green-700", label: "On Track" },
  "at-risk": { bg: "bg-amber-50", text: "text-amber-700", label: "At Risk" },
  disengaged: { bg: "bg-red-50", text: "text-red-700", label: "Disengaged" },
};

export function AttendanceTab({ students }: AttendanceTabProps) {
  const [massRecords, setMassRecords] = useState<AttendanceRecord[]>([]);
  const [techRecords, setTechRecords] = useState<AttendanceRecord[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridTrack, setGridTrack] = useState<"mass" | "techplus">("mass");
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  const fetchAllAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const [massRes, techRes, progressRes] = await Promise.all([
        fetch("/api/attendance?track=mass"),
        fetch("/api/attendance?track=techplus"),
        fetch("/api/week-progress"),
      ]);
      if (massRes.ok) {
        const d = await massRes.json();
        setMassRecords(d.records || []);
      }
      if (techRes.ok) {
        const d = await techRes.json();
        setTechRecords(d.records || []);
      }
      if (progressRes.ok) {
        const d = await progressRes.json();
        setProgressRecords(d.records || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAttendance();
  }, [fetchAllAttendance]);

  // Estimate weeks elapsed based on current date
  const massWeeksElapsed = useMemo(() => {
    const start = new Date("2026-03-24");
    const now = new Date();
    if (now < start) return 0;
    return Math.min(MASS_WEEKS, Math.ceil((now.getTime() - start.getTime()) / (7 * 86400000)));
  }, []);

  const techWeeksElapsed = useMemo(() => {
    const start = new Date("2026-04-01");
    const now = new Date();
    if (now < start) return 0;
    return Math.min(TECH_WEEKS, Math.ceil((now.getTime() - start.getTime()) / (7 * 86400000)));
  }, []);

  // Compute per-week attendance rates for trend chart
  const weeklyRates = useMemo(() => {
    if (students.length === 0) return { mass: [] as number[], tech: [] as number[] };
    const mass: number[] = [];
    for (let w = 1; w <= massWeeksElapsed; w++) {
      const count = students.filter((s) =>
        massRecords.some((r) => r.student_id === s.id && r.week_number === w && r.session_number === 1)
      ).length;
      mass.push(Math.round((count / students.length) * 100));
    }
    const tech: number[] = [];
    for (let w = 1; w <= techWeeksElapsed; w++) {
      // Average of both sessions
      let total = 0;
      for (let sess = 1; sess <= 2; sess++) {
        const count = students.filter((s) =>
          techRecords.some((r) => r.student_id === s.id && r.week_number === w && r.session_number === sess)
        ).length;
        total += count;
      }
      tech.push(Math.round((total / (students.length * 2)) * 100));
    }
    return { mass, tech };
  }, [students, massRecords, techRecords, massWeeksElapsed, techWeeksElapsed]);

  // Overall rates
  const massOverall = useMemo(() => {
    const possible = massWeeksElapsed * students.length;
    if (possible === 0) return 0;
    return Math.round((massRecords.length / possible) * 100);
  }, [massRecords, massWeeksElapsed, students]);

  const techOverall = useMemo(() => {
    const possible = techWeeksElapsed * TECH_SESSIONS_PER_WEEK * students.length;
    if (possible === 0) return 0;
    return Math.round((techRecords.length / possible) * 100);
  }, [techRecords, techWeeksElapsed, students]);

  // Student risk list
  const risks = useMemo(
    () =>
      computeStudentRisks(students, massRecords, techRecords, progressRecords, massWeeksElapsed, techWeeksElapsed).sort(
        (a, b) => a.engagementScore - b.engagementScore
      ),
    [students, massRecords, techRecords, progressRecords, massWeeksElapsed, techWeeksElapsed]
  );

  const atRiskCount = risks.filter((r) => r.status !== "on-track").length;

  // --- Attendance grid helpers (scoped to gridTrack) ---
  const gridRecords = gridTrack === "mass" ? massRecords : techRecords;
  const totalWeeks = gridTrack === "mass" ? MASS_WEEKS : TECH_WEEKS;
  const sessionsPerWeek = gridTrack === "mass" ? 1 : TECH_SESSIONS_PER_WEEK;

  function isPresent(studentId: string, week: number, session: number) {
    return gridRecords.some(
      (r) =>
        r.student_id === studentId &&
        r.track === gridTrack &&
        r.week_number === week &&
        r.session_number === session
    );
  }

  function attendanceRateForWeek(week: number, session: number): number {
    if (students.length === 0) return 0;
    const count = students.filter((s) => isPresent(s.id, week, session)).length;
    return Math.round((count / students.length) * 100);
  }

  async function toggleAttendance(studentId: string, week: number, session: number) {
    const key = `${studentId}-${buildWeekKey(gridTrack, week, session)}`;
    setToggling(key);
    const present = isPresent(studentId, week, session);
    const setRecords = gridTrack === "mass" ? setMassRecords : setTechRecords;

    try {
      if (present) {
        await fetch("/api/attendance", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: studentId, track: gridTrack, week_number: week, session_number: session }),
        });
        setRecords((prev) =>
          prev.filter(
            (r) =>
              !(r.student_id === studentId && r.track === gridTrack && r.week_number === week && r.session_number === session)
          )
        );
      } else {
        await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: studentId, track: gridTrack, week_number: week, session_number: session }),
        });
        setRecords((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            student_id: studentId,
            track: gridTrack,
            week_number: week,
            session_number: session,
            checked_in_at: new Date().toISOString(),
            marked_by: null,
          },
        ]);
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={18} className="animate-spin text-neutral-300 mx-auto mb-2" />
        <p className="text-xs text-neutral-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: Program Health ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-neutral-900">Program Health</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(risks)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors"
            >
              <Download size={12} />
              Export CSV
            </button>
            <button
              onClick={fetchAllAttendance}
              disabled={loading}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-xl font-bold text-neutral-900">{students.length}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Enrolled</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className={`text-xl font-bold ${massOverall >= 80 ? "text-green-600" : massOverall >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {massOverall}%
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">MASS Rate</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className={`text-xl font-bold ${techOverall >= 80 ? "text-green-600" : techOverall >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {techOverall}%
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Tech+ Rate</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className={`text-xl font-bold ${atRiskCount === 0 ? "text-green-600" : "text-amber-600"}`}>
              {atRiskCount}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Need Attention</p>
          </div>
        </div>

        {/* Week-over-week attendance trend */}
        {(weeklyRates.mass.length > 0 || weeklyRates.tech.length > 0) && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-neutral-400" />
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Weekly Attendance Trend
              </p>
            </div>
            <div className="space-y-3">
              {weeklyRates.mass.length > 0 && (
                <div>
                  <p className="text-[11px] text-neutral-500 mb-1.5">MASS Wraparound</p>
                  <div className="flex items-end gap-1 h-10">
                    {weeklyRates.mass.map((rate, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            rate >= 80 ? "bg-green-400" : rate >= 50 ? "bg-amber-400" : "bg-red-300"
                          }`}
                          style={{ height: `${Math.max(rate * 0.4, 2)}px` }}
                          title={`Week ${i + 1}: ${rate}%`}
                        />
                        <span className="text-[9px] text-neutral-400">W{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {weeklyRates.tech.length > 0 && (
                <div>
                  <p className="text-[11px] text-neutral-500 mb-1.5">CompTIA Tech+</p>
                  <div className="flex items-end gap-1 h-10">
                    {weeklyRates.tech.map((rate, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            rate >= 80 ? "bg-green-400" : rate >= 50 ? "bg-amber-400" : "bg-red-300"
                          }`}
                          style={{ height: `${Math.max(rate * 0.4, 2)}px` }}
                          title={`Week ${i + 1}: ${rate}%`}
                        />
                        <span className="text-[9px] text-neutral-400">W{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Student Risk List ── */}
      {students.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Student Overview
            </h2>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:flex items-center px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
              <div className="flex-1">Student</div>
              <div className="w-16 text-center">MASS</div>
              <div className="w-16 text-center">Tech+</div>
              <div className="w-20 text-center">Overall</div>
              <div className="w-20 text-center">Streak</div>
              <div className="w-20 text-center">Done</div>
              <div className="w-24 text-center">Status</div>
            </div>
            <div className="divide-y divide-neutral-50">
              {risks.map(({ student, massRate, techRate, combinedRate, consecutiveMisses, completionRate, status }) => {
                const style = STATUS_STYLES[status];
                return (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 px-4 py-3 sm:py-2.5 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate sm:hidden">
                        MASS {massRate}% · Tech+ {techRate}% · Done {completionRate}% · {consecutiveMisses > 0 ? `${consecutiveMisses} missed` : "No misses"}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center">
                      <div className="w-16 text-center">
                        <span className={`text-xs font-semibold ${massRate >= 80 ? "text-green-600" : massRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {massRate}%
                        </span>
                      </div>
                      <div className="w-16 text-center">
                        <span className={`text-xs font-semibold ${techRate >= 80 ? "text-green-600" : techRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {techRate}%
                        </span>
                      </div>
                      <div className="w-20 text-center">
                        <span className={`text-xs font-bold ${combinedRate >= 80 ? "text-green-600" : combinedRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {combinedRate}%
                        </span>
                      </div>
                      <div className="w-20 text-center">
                        {consecutiveMisses > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <TrendingDown size={11} />
                            {consecutiveMisses}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-300">—</span>
                        )}
                      </div>
                      <div className="w-20 text-center">
                        <span className={`text-xs font-semibold ${completionRate >= 80 ? "text-green-600" : completionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {completionRate}%
                        </span>
                      </div>
                    </div>
                    <div className="w-24 flex justify-center sm:justify-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: Attendance Grid ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <UserCheck size={14} className="text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Mark Attendance
            </h2>
          </div>
          <div className="flex items-center gap-1 sm:ml-auto">
            <div className="flex rounded-lg bg-neutral-100 p-1 gap-1">
              {(["mass", "techplus"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setGridTrack(t); setExpandedWeek(1); }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    gridTrack === t
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  {t === "mass" ? "MASS" : "Tech+"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={24} className="text-neutral-200 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">No students enrolled yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <div
                key={week}
                className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpandedWeek(expandedWeek === week ? null : week)}
                  className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                      {week}
                    </span>
                    <p className="text-sm font-semibold text-neutral-900 text-left">
                      Week {week}
                      {gridTrack === "mass" ? "" : ` — ${sessionsPerWeek} sessions`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map((session) => {
                      const rate = attendanceRateForWeek(week, session);
                      return (
                        <div key={session} className="flex items-center gap-1">
                          {sessionsPerWeek > 1 && (
                            <span className="text-[10px] text-neutral-400">S{session}</span>
                          )}
                          <span
                            className={`text-[11px] font-semibold ${
                              rate >= 80 ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-neutral-400"
                            }`}
                          >
                            {rate}%
                          </span>
                        </div>
                      );
                    })}
                    <ChevronDown
                      size={14}
                      className={`text-neutral-400 transition-transform ${expandedWeek === week ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {expandedWeek === week && (
                  <div className="border-t border-neutral-100">
                    {sessionsPerWeek > 1 && (
                      <div className="flex items-center px-4 py-2 bg-neutral-50 border-b border-neutral-100">
                        <div className="flex-1" />
                        {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map((session) => (
                          <div
                            key={session}
                            className="w-16 text-center text-[10px] font-semibold text-neutral-400 uppercase tracking-wide"
                          >
                            {session === 1 ? "Wed" : "Fri"}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="divide-y divide-neutral-50">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">
                              {student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {student.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mr-1">
                            {(() => {
                              const pr = progressRecords.find(
                                (r) => r.student_id === student.id && r.track_slug === gridTrack && r.week_number === week
                              );
                              return (
                                <>
                                  <span title="Video watched" className={pr?.video_watched ? "text-green-500" : "text-neutral-200"}>
                                    <Video size={12} />
                                  </span>
                                  <span title="Homework submitted" className={pr?.homework_submitted ? "text-green-500" : "text-neutral-200"}>
                                    <FileText size={12} />
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map((session) => {
                              const key = `${student.id}-${buildWeekKey(gridTrack, week, session)}`;
                              const present = isPresent(student.id, week, session);
                              const isBusy = toggling === key;
                              return (
                                <button
                                  key={session}
                                  onClick={() => toggleAttendance(student.id, week, session)}
                                  disabled={isBusy}
                                  title={present ? `Remove attendance for Session ${session}` : `Mark present for Session ${session}`}
                                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                                    present
                                      ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500"
                                      : "bg-neutral-100 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-500"
                                  }`}
                                >
                                  {present ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                                </button>
                              );
                            })}
                          </div>
                          <div className="w-10 text-right">
                            {(() => {
                              const count = gridRecords.filter(
                                (r) => r.student_id === student.id && r.track === gridTrack && r.week_number === week
                              ).length;
                              const total = sessionsPerWeek;
                              return (
                                <span
                                  className={`text-[11px] font-semibold ${
                                    count === total ? "text-green-600" : count > 0 ? "text-amber-600" : "text-neutral-300"
                                  }`}
                                >
                                  {count}/{total}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={12} className="text-neutral-400" />
                        <span className="text-[11px] text-neutral-400">Week {week} rate</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map((session) => {
                          const rate = attendanceRateForWeek(week, session);
                          const count = students.filter((s) => isPresent(s.id, week, session)).length;
                          return (
                            <span
                              key={session}
                              className={`text-[11px] font-semibold ${
                                rate >= 80 ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-neutral-500"
                              }`}
                            >
                              {sessionsPerWeek > 1 ? `S${session}: ` : ""}
                              {count}/{students.length} ({rate}%)
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
