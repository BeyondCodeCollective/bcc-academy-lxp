"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bulkAssignTrack } from "./actions";
import type { StudentTrackRow, InstructorTrackRow } from "./actions";
import { Users, CaretDown as ChevronDown, Check, UserCheck, Trash as Trash2, UserPlus, Plus, CircleNotch as Loader2 } from "@phosphor-icons/react";
import { Avatar } from "@/components/avatar";
import { BackLink, buttonClass, fieldInput } from "@/components/ui";
import { PendingPeopleSection, StatusPill } from "./pending-people";
import type { PendingPerson } from "@/lib/people-hub";
import { AddPeoplePanel } from "./add-people-panel";
import { type CohortRow, type StudentRow, type AdminTrackConfig } from "./admin-shared";

// ─── People Tab ───────────────────────────────────────────────────────────────

export function PeopleTab({
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
  attendanceRates = null,
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
  engagementScores: Record<string, { total: number; attendance: number; submissions: number; reflections: number; videos: number }>;
  isManager: boolean;
  assignableRoles?: string[];
  programSlug: string;
  enrollmentSaving: string | null;
  instrTrackSaving: string | null;
  studentSaving: string | null;
  onUpdateStudent: (id: string, field: "role" | "cohort_id" | "first_name" | "last_name", value: string) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onToggleStudentTrack: (studentId: string, trackSlug: string) => Promise<void>;
  onToggleInstructorTrack: (instructorId: string, trackSlug: string) => Promise<void>;
  onStudentAdded: (student: StudentRow) => void;
  initialTrackFilter?: string;
  /** Sessions held + each learner's attended count, for the open course. */
  attendanceRates?: { held: number; attended: Record<string, number> } | null;
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

  // The pending list (pre-account invites/allowlist) must obey the SAME filters
  // as the roster, or picking a cohort still shows everyone's pending rows mixed
  // together. Pending people have no account yet, so role only gates them by
  // "student" vs a specific staff role.
  const filteredPending = pendingPeople.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrack = trackFilter === "all" || p.trackSlugs.includes(trackFilter);
    const matchesRole = roleFilter === "all" || roleFilter === "student";
    return matchesSearch && matchesTrack && matchesRole;
  });

  function getStudentTrackSlugs(studentId: string) {
    return enrollments.filter((e) => e.student_id === studentId).map((e) => e.track_slug);
  }
  function getInstructorTrackSlugs(instructorId: string) {
    return instrTracks.filter((e) => e.student_id === instructorId).map((e) => e.track_slug);
  }
  function getTrackCount(studentId: string) {
    // The expanded card shows TEACHING (instructor_tracks) for instructors and
    // TRACKS (student_tracks enrollments) for everyone else — count from the
    // same source so the roster badge matches what you see when you expand.
    const isInstructor =
      students.find((s) => s.id === studentId)?.role === "instructor";
    const rows = isInstructor ? instrTracks : enrollments;
    return rows.filter((e) => e.student_id === studentId).length;
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


  return (
    <div className="space-y-6">
      {!embedded && (
        <BackLink href="/dashboard/admin" label="Admin" />
      )}
      {/* Header */}
      {(!embedded || isManager) && (
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Program-wide totals used to render here — removed: they ignored the
           filters below and fought the filtered counts (three unrelated
           numbers on one screen). The summary strip by the filters is now the
           only count, always describing the list it sits above. */}
        <div />
        {!embedded && isManager && (
          <div className="flex flex-wrap items-center gap-2">
            {showBulkAssign ? (
              <>
                <div className="relative">
                  <select
                    value={bulkTrack}
                    onChange={(e) => setBulkTrack(e.target.value)}
                    className="appearance-none border border-rule bg-white pl-3 pr-7 py-2 text-xs font-medium text-ink focus:border-ink-faint"
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
        {!embedded && isManager && (
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-2 text-sm text-ink focus:border-ink-faint"
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        )}
        {!embedded && isManager && tracks.length > 0 && (
          <div className="relative">
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-2 text-sm text-ink focus:border-ink-faint"
            >
              <option value="all">All tracks</option>
              {tracks.map((t) => (
                <option key={t.slug} value={t.slug}>{t.shortName}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        )}
      </div>

      {/* Summary strip — the ONE set of numbers on this page, always
         describing the list below with the current filters applied. Replaces
         the program-wide header count, "N shown", and the Pending section's
         own count, which each measured a different population. */}
      {(() => {
        const joined = filtered.filter((s) => s.role === "student").length;
        const staff = filtered.length - joined;
        const invited = filteredPending.filter((p) => p.inviteSent).length;
        const allowlisted = filteredPending.length - invited;
        const parts = [
          `${joined} joined`,
          ...(invited > 0 ? [`${invited} invited`] : []),
          ...(allowlisted > 0 ? [`${allowlisted} allowlisted, not yet invited`] : []),
          ...(staff > 0 ? [`${staff} staff`] : []),
        ];
        return <p className="text-sm text-ink-soft">{parts.join(" · ")}</p>;
      })()}

      {/* Roster — ONE list: account holders first, then pending people
         (invited/allowlisted, no account yet) as rows in the same panel, so
         the whole pipeline reads as a single list instead of stacked
         sections. Pending rows are managers-only (the invite/remove actions
         are manage_students). */}
      <div className="divide-y divide-neutral-100 overflow-hidden panel">
        {filtered.length === 0 && (!isManager || filteredPending.length === 0) && (
          <p className="p-4 text-sm text-ink-soft">No people found.</p>
        )}
        {filtered.map((s) => {
          const fullName =
            [s.first_name, s.last_name].filter(Boolean).join(" ") || "—";
          const isExpanded = expandedId === s.id;
          const trackCount = getTrackCount(s.id);
          // Attendance only means something for a learner in the open course —
          // staff don't check in, and the rate is course-scoped.
          const attendanceRate =
            attendanceRates && s.role === "student"
              ? (() => {
                  const attended = attendanceRates.attended[s.id] ?? 0;
                  const held = attendanceRates.held;
                  return {
                    attended,
                    held,
                    // held is the count of distinct sessions that have any
                    // attendance recorded, so it's 0 for a course that hasn't
                    // met yet (and after a failed fetch). Without this guard
                    // 0/0 renders "NaN%" in the roster.
                    pct: held > 0 ? Math.round((attended / held) * 100) : 0,
                  };
                })()
              : null;
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
                  <p className="text-micro text-ink-faint truncate">
                    {s.last_activity_at
                      ? `Last active: ${new Date(s.last_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : s.last_seen_at
                      ? `Last login: ${new Date(s.last_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "Never logged in"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {attendanceRate && (
                    <span
                      className="text-micro tabular-nums hidden sm:block text-ink-soft"
                      title={`Attended ${attendanceRate.attended} of ${attendanceRate.held} sessions held`}
                    >
                      {attendanceRate.pct}% attendance
                    </span>
                  )}
                  <span className="text-micro text-ink-faint tabular-nums hidden sm:block">
                    {trackCount} {trackCount === 1 ? "track" : "tracks"}
                  </span>
                  {s.role === "student" && (
                    <StatusPill status={s.last_activity_at ? "active" : "joined"} />
                  )}
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-micro font-medium ${
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
                  {/* Name — saves on blur or Enter. Fixes typos/casing for the
                     certificate and Zoom join without asking the student. */}
                  <div className="flex flex-wrap gap-3">
                    {([["first_name", "First name"], ["last_name", "Last name"]] as const).map(
                      ([field, label]) => (
                        <div key={field}>
                          <label className="text-micro font-medium uppercase tracking-wide text-ink-soft">
                            {label}
                          </label>
                          <input
                            type="text"
                            defaultValue={s[field] ?? ""}
                            disabled={studentSaving === s.id}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== (s[field] ?? "")) onUpdateStudent(s.id, field, v);
                              else e.target.value = s[field] ?? "";
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className="mt-1 block w-40 border border-rule bg-white px-3 py-2 text-xs font-medium text-ink focus:border-ink-faint disabled:opacity-60"
                          />
                        </div>
                      ),
                    )}
                  </div>

                  {/* Role + cohort */}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="text-micro font-medium uppercase tracking-wide text-ink-soft">
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
                          className="appearance-none border border-rule bg-white pl-3 pr-7 py-2 text-xs font-medium text-ink focus:border-ink-faint disabled:opacity-60"
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
                    {/* The Group (cohort) selector used to render here. Removed
                       2026-08-06: enrollment lives in the Tracks chips below;
                       the cohort dropdown only surfaced stale spring-era rows
                       and confused course-based programs. cohort_id data is
                       untouched (auto-assignment at signup still works). */}
                  </div>

                  {/* Track chips — every track is rendered; the filled "✓"
                     chips are the student's current enrollments, the
                     outlined "+" chips are tracks they're not in (click to
                     add). Previously labeled "Enrolled tracks" which made
                     the "+" chips read like current memberships. */}
                  {tracks.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-baseline gap-3">
                        <p className="text-micro font-medium uppercase tracking-wide text-ink-soft">
                          {s.role === "instructor" ? "Teaching" : "Tracks"}
                        </p>
                        <p className="text-micro text-ink-faint">
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
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro font-medium transition-colors disabled:opacity-60 ${
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
                      <span className="text-ink-faint">·</span>
                      <span>{engagementScores[s.id].videos} watched</span>
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
        {isManager && filteredPending.length > 0 && (
          <PendingPeopleSection
            inline
            pending={filteredPending}
            trackNames={Object.fromEntries(tracks.map((t) => [t.slug, t.shortName || t.name]))}
          />
        )}
      </div>
    </div>
  );
}
