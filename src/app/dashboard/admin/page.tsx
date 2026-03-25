import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AddResourceForm } from "./add-resource-form";
import { SessionToggles } from "./session-toggles";
import { StudentManager } from "./student-manager";
import { CohortEditor } from "./cohort-editor";
import type { Student, Session, Cohort } from "@/lib/types";

const DEMO_SESSIONS: Session[] = [
  { id: "d1", cohort_id: "demo", week_number: 1, session_number: 1, title: "Course Introduction", description: null, session_date: "2026-03-10", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "completed", created_at: "" },
  { id: "d2", cohort_id: "demo", week_number: 1, session_number: 2, title: "IT Fundamentals Overview", description: null, session_date: "2026-03-12", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "completed", created_at: "" },
  { id: "d3", cohort_id: "demo", week_number: 2, session_number: 3, title: "Device Configuration", description: null, session_date: "2026-03-17", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "upcoming", created_at: "" },
  { id: "d4", cohort_id: "demo", week_number: 2, session_number: 4, title: "Operating Systems", description: null, session_date: "2026-03-19", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "upcoming", created_at: "" },
];

export default async function AdminPage() {
  let cohortId = "demo";
  let sessions: Session[] = DEMO_SESSIONS;
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: student } = await supabase
      .from("students")
      .select("role, cohort_id")
      .eq("id", user.id)
      .single<Pick<Student, "role" | "cohort_id">>();

    if (student?.role !== "admin") redirect("/dashboard");

    cohortId = student.cohort_id!;

    const { data: dbSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("week_number", { ascending: true })
      .order("session_number", { ascending: true })
      .returns<Session[]>();

    sessions = dbSessions || [];

    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, email, role, cohort_id")
      .order("created_at", { ascending: true });

    allStudents = students || [];

    const { data: cohorts } = await supabase
      .from("cohorts")
      .select("id, name, display_name, start_date, total_weeks")
      .order("created_at", { ascending: true });

    allCohorts = cohorts || [];
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Admin Panel</h1>

      {/* Cohort Management */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Cohorts</h2>
          <span className="text-xs text-neutral-400">{allCohorts.length} total</span>
        </div>
        <CohortEditor cohorts={allCohorts} />
      </section>

      {/* Student Management */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Students</h2>
          <span className="text-xs text-neutral-400">{allStudents.length} total</span>
        </div>
        <StudentManager students={allStudents} cohorts={allCohorts.map(c => ({ id: c.id, name: c.name }))} />
      </section>

      {/* Session Management */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Session Management</h2>
        <SessionToggles sessions={sessions} />
      </section>

      {/* Add Resource */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Add Resource</h2>
        <AddResourceForm cohortId={cohortId} />
      </section>
    </div>
  );
}
