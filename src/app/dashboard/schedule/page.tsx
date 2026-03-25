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
  // Week 1
  makeDemoSession(1, 1, "MASS: Storytelling for Career Success", "upcoming"),
  makeDemoSession(1, 2, "Tech+: IT Fundamentals", "upcoming"),
  // Week 2
  makeDemoSession(2, 1, "MASS: Networking", "upcoming"),
  makeDemoSession(2, 2, "Tech+: Devices & OS", "upcoming"),
  // Week 3
  makeDemoSession(3, 1, "MASS: The Art of the Brag", "upcoming"),
  makeDemoSession(3, 2, "Tech+: Networking Basics", "upcoming"),
  // Week 4
  makeDemoSession(4, 1, "MASS: Guest Speaker", "upcoming"),
  makeDemoSession(4, 2, "Tech+: Cybersecurity", "upcoming"),
  // Week 5
  makeDemoSession(5, 1, "MASS: Planning", "upcoming"),
  makeDemoSession(5, 2, "Tech+: Software & Data", "upcoming"),
  // Week 6
  makeDemoSession(6, 1, "MASS: Guest Speaker", "upcoming"),
  makeDemoSession(6, 2, "Tech+: Cloud & Support", "upcoming"),
  // Week 7
  makeDemoSession(7, 1, "MASS: Money & Financial Confidence", "upcoming"),
  makeDemoSession(7, 2, "Tech+: Cert Review & Final Assessment", "upcoming"),
  // Week 8
  makeDemoSession(8, 1, "MASS: Career Expo", "upcoming"),
];

export default async function SchedulePage() {
  let currentWeek = 1;
  let totalWeeks = 8;
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

    sessions = (dbSessions && dbSessions.length > 0) ? dbSessions : DEMO_SESSIONS;
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
