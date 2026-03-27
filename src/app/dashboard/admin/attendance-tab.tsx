"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCheck,
  Users,
  CheckCircle2,
  Circle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

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
const TECH_WEEKS = 7;
const TECH_SESSIONS_PER_WEEK = 2;

function buildWeekKey(track: string, week: number, session: number) {
  return `${track}-w${week}-s${session}`;
}

export function AttendanceTab({ students }: AttendanceTabProps) {
  const [track, setTrack] = useState<"mass" | "techplus">("mass");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?track=${track}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } finally {
      setLoading(false);
    }
  }, [track]);

  useEffect(() => {
    fetchAttendance();
    setExpandedWeek(1);
  }, [fetchAttendance]);

  function isPresent(studentId: string, week: number, session: number) {
    return records.some(
      (r) =>
        r.student_id === studentId &&
        r.track === track &&
        r.week_number === week &&
        r.session_number === session
    );
  }

  async function toggleAttendance(studentId: string, week: number, session: number) {
    const key = `${studentId}-${buildWeekKey(track, week, session)}`;
    setToggling(key);
    const present = isPresent(studentId, week, session);

    try {
      if (present) {
        await fetch("/api/attendance", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            track,
            week_number: week,
            session_number: session,
          }),
        });
        setRecords((prev) =>
          prev.filter(
            (r) =>
              !(
                r.student_id === studentId &&
                r.track === track &&
                r.week_number === week &&
                r.session_number === session
              )
          )
        );
      } else {
        await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            track,
            week_number: week,
            session_number: session,
          }),
        });
        setRecords((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            student_id: studentId,
            track,
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

  const totalWeeks = track === "mass" ? MASS_WEEKS : TECH_WEEKS;
  const sessionsPerWeek = track === "mass" ? 1 : TECH_SESSIONS_PER_WEEK;

  function attendanceRateForWeek(week: number, session: number): number {
    if (students.length === 0) return 0;
    const count = students.filter((s) => isPresent(s.id, week, session)).length;
    return Math.round((count / students.length) * 100);
  }

  const totalPossibleSessions = totalWeeks * sessionsPerWeek * students.length;
  const totalPresent = records.filter((r) => r.track === track).length;
  const overallRate =
    totalPossibleSessions > 0
      ? Math.round((totalPresent / totalPossibleSessions) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Header + track toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-neutral-900">Attendance</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {students.length} students · {overallRate}% overall rate
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg bg-neutral-100 p-1 gap-1">
            {(["mass", "techplus"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTrack(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  track === t
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {t === "mass" ? "MASS" : "Tech+"}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-neutral-900">{students.length}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Students</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-neutral-900">{totalWeeks}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Weeks</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
          <p className={`text-xl font-bold ${overallRate >= 80 ? "text-green-600" : overallRate >= 60 ? "text-amber-600" : "text-neutral-900"}`}>
            {overallRate}%
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Attendance</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <RefreshCw size={18} className="animate-spin text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">Loading attendance...</p>
        </div>
      ) : students.length === 0 ? (
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
              {/* Week header — clickable to expand */}
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
                    {track === "mass" ? "" : ` — ${sessionsPerWeek} sessions`}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map(
                    (session) => {
                      const rate = attendanceRateForWeek(week, session);
                      return (
                        <div key={session} className="flex items-center gap-1">
                          {sessionsPerWeek > 1 && (
                            <span className="text-[10px] text-neutral-400">S{session}</span>
                          )}
                          <span
                            className={`text-[11px] font-semibold ${
                              rate >= 80
                                ? "text-green-600"
                                : rate >= 60
                                ? "text-amber-600"
                                : "text-neutral-400"
                            }`}
                          >
                            {rate}%
                          </span>
                        </div>
                      );
                    }
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-neutral-400 transition-transform ${
                      expandedWeek === week ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Expanded student list */}
              {expandedWeek === week && (
                <div className="border-t border-neutral-100">
                  {/* Session column headers for Tech+ */}
                  {sessionsPerWeek > 1 && (
                    <div className="flex items-center px-4 py-2 bg-neutral-50 border-b border-neutral-100">
                      <div className="flex-1" />
                      {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map(
                        (session) => (
                          <div
                            key={session}
                            className="w-16 text-center text-[10px] font-semibold text-neutral-400 uppercase tracking-wide"
                          >
                            {session === 1 ? "Wed" : "Fri"}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="divide-y divide-neutral-50">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {student.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {Array.from(
                            { length: sessionsPerWeek },
                            (_, j) => j + 1
                          ).map((session) => {
                            const key = `${student.id}-${buildWeekKey(track, week, session)}`;
                            const present = isPresent(student.id, week, session);
                            const isBusy = toggling === key;
                            return (
                              <button
                                key={session}
                                onClick={() =>
                                  toggleAttendance(student.id, week, session)
                                }
                                disabled={isBusy}
                                title={
                                  present
                                    ? `Remove attendance for Session ${session}`
                                    : `Mark present for Session ${session}`
                                }
                                className={`flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                                  present
                                    ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500"
                                    : "bg-neutral-100 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-500"
                                }`}
                              >
                                {present ? (
                                  <CheckCircle2 size={15} />
                                ) : (
                                  <Circle size={15} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {/* Per-student attendance count in this track */}
                        <div className="w-10 text-right">
                          {(() => {
                            const studentRecords = records.filter(
                              (r) =>
                                r.student_id === student.id &&
                                r.track === track &&
                                r.week_number === week
                            );
                            const total = sessionsPerWeek;
                            const count = studentRecords.length;
                            return (
                              <span
                                className={`text-[11px] font-semibold ${
                                  count === total
                                    ? "text-green-600"
                                    : count > 0
                                    ? "text-amber-600"
                                    : "text-neutral-300"
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

                  {/* Week attendance rate footer */}
                  <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <UserCheck size={12} className="text-neutral-400" />
                      <span className="text-[11px] text-neutral-400">Week {week} rate</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {Array.from({ length: sessionsPerWeek }, (_, j) => j + 1).map(
                        (session) => {
                          const rate = attendanceRateForWeek(week, session);
                          const count = students.filter((s) =>
                            isPresent(s.id, week, session)
                          ).length;
                          return (
                            <span
                              key={session}
                              className={`text-[11px] font-semibold ${
                                rate >= 80
                                  ? "text-green-600"
                                  : rate >= 60
                                  ? "text-amber-600"
                                  : "text-neutral-500"
                              }`}
                            >
                              {sessionsPerWeek > 1 ? `S${session}: ` : ""}
                              {count}/{students.length} ({rate}%)
                            </span>
                          );
                        }
                      )}
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
