import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AddResourceForm } from "./add-resource-form";
import { SessionToggles } from "./session-toggles";
import type { Student, Session } from "@/lib/types";

const DEMO_SESSIONS: Session[] = [
  { id: "d1", cohort_id: "demo", week_number: 1, session_number: 1, title: "Course Introduction", description: null, session_date: "2026-03-10", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "completed", created_at: "" },
  { id: "d2", cohort_id: "demo", week_number: 1, session_number: 2, title: "IT Fundamentals Overview", description: null, session_date: "2026-03-12", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "completed", created_at: "" },
  { id: "d3", cohort_id: "demo", week_number: 2, session_number: 3, title: "Device Configuration", description: null, session_date: "2026-03-17", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "upcoming", created_at: "" },
  { id: "d4", cohort_id: "demo", week_number: 2, session_number: 4, title: "Operating Systems", description: null, session_date: "2026-03-19", start_time: "18:00:00", end_time: "20:00:00", meeting_link: "#", status: "upcoming", created_at: "" },
];

export default async function AdminPage() {
  let cohortId = "demo";
  let sessions: Session[] = DEMO_SESSIONS;

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
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* Add Resource */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Add Resource</h2>
        <AddResourceForm cohortId={cohortId} />
      </section>

      {/* Session Management */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Session Management</h2>
        <SessionToggles sessions={sessions} />
      </section>
    </div>
  );
}
