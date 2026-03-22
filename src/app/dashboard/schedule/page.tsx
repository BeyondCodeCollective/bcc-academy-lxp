import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeCurrentWeek } from "@/lib/utils";
import { ScheduleList } from "@/components/schedule-list";
import type { Student, Cohort, Session } from "@/lib/types";

function makeDemoSession(
  week: number,
  num: number,
  title: string,
  status: Session["status"]
): Session {
  return {
    id: `demo-w${week}-s${num}`,
    cohort_id: "demo",
    week_number: week,
    session_number: (week - 1) * 2 + num,
    title,
    description: null,
    session_date: "2026-03-24",
    start_time: "18:00:00",
    end_time: "20:00:00",
    meeting_link: "#",
    status,
    created_at: new Date().toISOString(),
  };
}

const DEMO_SESSIONS: Session[] = [
  makeDemoSession(1, 1, "Course Introduction", "upcoming"),
  makeDemoSession(1, 2, "IT Fundamentals Overview", "upcoming"),
  makeDemoSession(2, 1, "Device Configuration", "upcoming"),
  makeDemoSession(2, 2, "Operating Systems", "upcoming"),
  makeDemoSession(3, 1, "Networking Basics", "upcoming"),
  makeDemoSession(3, 2, "TCP/IP & DNS", "upcoming"),
  makeDemoSession(4, 1, "Security Principles", "upcoming"),
  makeDemoSession(4, 2, "Threat Landscape", "upcoming"),
  makeDemoSession(5, 1, "Software Dev Basics", "upcoming"),
  makeDemoSession(5, 2, "Database Fundamentals", "upcoming"),
  makeDemoSession(6, 1, "Cloud Concepts", "upcoming"),
  makeDemoSession(6, 2, "IT Support Workflows", "upcoming"),
  makeDemoSession(7, 1, "Certification Review", "upcoming"),
  makeDemoSession(7, 2, "Final Assessment", "upcoming"),
];

export default async function SchedulePage() {
  let currentWeek = 1;
  let totalWeeks = 7;
  let sessions: Session[] = DEMO_SESSIONS;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: student } = await supabase
      .from("students")
      .select("cohort_id")
      .eq("id", user.id)
      .single<Pick<Student, "cohort_id">>();

    let cohortId = student?.cohort_id;

    // Auto-assign to first cohort if not yet assigned
    if (!cohortId) {
      const { data: defaultCohort } = await supabase
        .from("cohorts")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (defaultCohort) {
        await supabase
          .from("students")
          .update({ cohort_id: defaultCohort.id })
          .eq("id", user.id);
        cohortId = defaultCohort.id;
      }
    }

    if (!cohortId) redirect("/dashboard");

    const { data: cohort } = await supabase
      .from("cohorts")
      .select("*")
      .eq("id", cohortId)
      .single<Cohort>();

    if (!cohort) redirect("/dashboard");

    currentWeek = computeCurrentWeek(cohort.start_date, cohort.total_weeks);
    totalWeeks = cohort.total_weeks;

    const { data: dbSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("week_number", { ascending: true })
      .order("session_number", { ascending: true })
      .returns<Session[]>();

    sessions = dbSessions || [];
  }

  // Group sessions by week as a plain object for serialization
  const sessionsByWeek: Record<number, Session[]> = {};
  sessions.forEach((s) => {
    if (!sessionsByWeek[s.week_number]) sessionsByWeek[s.week_number] = [];
    sessionsByWeek[s.week_number].push(s);
  });

  const completedWeeks = currentWeek - 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Schedule</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {completedWeeks} of {totalWeeks} weeks completed
        </p>
      </div>

      <Suspense>
        <ScheduleList
          sessionsByWeek={sessionsByWeek}
          currentWeek={currentWeek}
          totalWeeks={totalWeeks}
        />
      </Suspense>
    </div>
  );
}
