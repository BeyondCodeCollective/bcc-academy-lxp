import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";

export default async function AdminPage() {
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    const { data: student } = await supabase
      .from("students")
      .select("role, cohort_id")
      .eq("id", session.user.id)
      .single<Pick<Student, "role" | "cohort_id">>();

    if (student?.role !== "admin") redirect("/dashboard");

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
    <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Admin Panel</h1>
      <AdminTabs cohorts={allCohorts} students={allStudents} />
    </div>
  );
}
