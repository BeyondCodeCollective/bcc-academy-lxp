import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";

export default async function AdminPage() {
  const program = await getProgram();
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    // Run all queries in parallel
    const [studentCheck, studentsResult, cohortsResult] = await Promise.all([
      supabase
        .from("students")
        .select("role")
        .eq("id", session.user.id)
        .single<Pick<Student, "role">>(),
      supabase
        .from("students")
        .select("id, first_name, last_name, email, role, cohort_id")
        .order("created_at", { ascending: true }),
      supabase
        .from("cohorts")
        .select("id, name, display_name, start_date, total_weeks")
        .order("created_at", { ascending: true }),
    ]);

    if (studentCheck.data?.role !== "admin") redirect("/dashboard");

    allStudents = studentsResult.data || [];
    allCohorts = cohortsResult.data || [];
  }

  // Serialize track configs for the client component
  const tracks = program.tracks.map((t) => ({
    slug: t.slug,
    name: t.name,
    shortName: t.shortName,
    totalWeeks: t.totalWeeks,
    sessionsPerWeek: t.sessionsPerWeek,
    instructor: t.instructor,
    sessionTimes: t.sessionTimes,
    weekSummaries: t.weekSummaries,
    weeks: t.weeks.map((w) => ({
      week: w.week,
      title: w.title,
      icon: w.icon,
      sessions: w.sessions.map((s) => ({ title: s.title })),
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Admin Panel</h1>
      <AdminTabs cohorts={allCohorts} students={allStudents} tracks={tracks} />
    </div>
  );
}
