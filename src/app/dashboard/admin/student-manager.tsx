"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCheck, Shield, ChevronDown } from "lucide-react";
import type { Student } from "@/lib/types";

type StudentRow = Pick<
  Student,
  "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id"
>;

export function StudentManager({
  students: initial,
  cohorts,
}: {
  students: StudentRow[];
  cohorts: { id: string; name: string }[];
}) {
  const [students, setStudents] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  async function updateStudent(
    id: string,
    field: "role" | "cohort_id",
    value: string
  ) {
    setSaving(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .update({ [field]: value })
      .eq("id", id);

    if (!error) {
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    }
    setSaving(null);
  }

  return (
    <div className="space-y-2">
      {students.length === 0 && (
        <p className="text-sm text-neutral-400 py-4 text-center">
          No students yet
        </p>
      )}
      {students.map((student) => (
        <div
          key={student.id}
          className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 transition-opacity ${
            saving === student.id ? "opacity-50" : ""
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
            {/* Role selector */}
            <div className="relative">
              <select
                value={student.role}
                onChange={(e) =>
                  updateStudent(
                    student.id,
                    "role",
                    e.target.value as "student" | "admin"
                  )
                }
                className="appearance-none rounded-md border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>

            {/* Cohort selector */}
            <div className="relative">
              <select
                value={student.cohort_id || ""}
                onChange={(e) =>
                  updateStudent(student.id, "cohort_id", e.target.value)
                }
                className="appearance-none rounded-md border border-neutral-200 bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none"
              >
                <option value="">No cohort</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
