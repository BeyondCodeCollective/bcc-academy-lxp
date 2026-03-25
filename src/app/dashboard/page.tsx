import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { computeCurrentWeek } from "@/lib/utils";
import Link from "next/link";
import type { Student, Cohort } from "@/lib/types";
import { WelcomeVideo } from "@/components/welcome-video";

const MASS_WEEKS: { week: number; topic: string; icon: string }[] = [
  { week: 1, topic: "Storytelling", icon: "🎙️" },
  { week: 2, topic: "Networking", icon: "🤝" },
  { week: 3, topic: "The Art of the Brag", icon: "💪" },
  { week: 4, topic: "Guest Speaker", icon: "🎤" },
  { week: 5, topic: "Planning", icon: "📋" },
  { week: 6, topic: "Guest Speaker", icon: "🎤" },
  { week: 7, topic: "Money", icon: "💰" },
  { week: 8, topic: "Career Expo", icon: "🎯" },
];

const TECH_WEEKS: { week: number; topic: string; icon: string }[] = [
  { week: 1, topic: "IT Fundamentals", icon: "💻" },
  { week: 2, topic: "Devices & OS", icon: "🖥️" },
  { week: 3, topic: "Networking", icon: "🌐" },
  { week: 4, topic: "Cybersecurity", icon: "🔒" },
  { week: 5, topic: "Software & Data", icon: "🗄️" },
  { week: 6, topic: "Cloud & Support", icon: "☁️" },
  { week: 7, topic: "Cert Review", icon: "🏆" },
];

export default async function DashboardPage() {
  let firstName = "there";
  let cohortName = "Cohort 1 — CompTIA Tech+ Foundations";
  let currentWeek = 1;
  let totalWeeks = 7;
  let noCohort = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    // Single query: student + cohort joined
    const { data: student } = await supabase
      .from("students")
      .select("first_name, cohort_id, cohorts(id, name, display_name, start_date, total_weeks)")
      .eq("id", session.user.id)
      .single();

    let cohortId = student?.cohort_id;
    const cohort = (student as Record<string, unknown>)?.cohorts as Cohort | null;

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
          .eq("id", session.user.id);
        cohortId = defaultCohort.id;
      }
    }

    if (cohort) {
      cohortName = cohort.display_name || cohort.name;
      currentWeek = computeCurrentWeek(cohort.start_date, cohort.total_weeks);
      totalWeeks = cohort.total_weeks;
    } else if (!cohortId) {
      noCohort = true;
    }

    firstName = student?.first_name || "there";
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    if (demoEmail) {
      const demoUser = getDemoUser(demoEmail);
      if (demoUser) {
        firstName = demoUser.first_name;
      } else {
        // Unknown email — use the part before @ as a name
        firstName = demoEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  // MASS starts with cohort (March 24), Tech+ starts April 1
  const TECH_PLUS_START = "2026-04-01";
  const massWeek = currentWeek;
  const techWeek = computeCurrentWeek(TECH_PLUS_START, 7);
  const techStarted = new Date() >= new Date(TECH_PLUS_START);

  const completedWeeks = massWeek - 1;
  const totalProgramWeeks = 8; // MASS is the longer track
  const pct = Math.round((completedWeeks / totalProgramWeeks) * 100);

  if (noCohort) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            You&apos;re signed in — your cohort hasn&apos;t started yet.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
            🏈
          </div>
          <h2 className="mt-4 text-lg font-semibold text-neutral-900">
            Hang tight!
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
            Your program cohort is being set up. You&apos;ll see your full dashboard here once it&apos;s ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 px-5 py-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{cohortName}</p>
      </div>

      {/* Progress summary */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Your Progress
            </p>
            <p className="text-xs text-neutral-400">
              Week {massWeek} of {totalProgramWeeks}
            </p>
          </div>
          <span className="text-2xl font-bold text-neutral-900">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Welcome Video */}
      <WelcomeVideo />


      {/* MASS Wraparound — Soft Skills */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-neutral-900">
            MASS Wraparound
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
            Active
          </span>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          8-week coaching · Mindset & Soft Skills · with Angel Aviles
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MASS_WEEKS.map(({ week, topic, icon }) => {
            const isCompleted = week < massWeek;
            const isCurrent = week === massWeek;
            const isFuture = week > massWeek;

            return (
              <Link
                key={week}
                href={`/dashboard/mass/${week}`}
                className={`group relative flex flex-col items-center rounded-xl border p-5 text-center transition-all ${
                  isCurrent
                    ? "border-neutral-900 bg-white shadow-sm"
                    : isCompleted
                      ? "border-neutral-200 bg-white hover:border-neutral-300"
                      : "border-neutral-100 bg-neutral-50 hover:border-neutral-200"
                }`}
              >
                <div
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                    isCompleted
                      ? "bg-green-50"
                      : isCurrent
                        ? "bg-neutral-900"
                        : "bg-neutral-100"
                  }`}
                >
                  {isFuture ? (
                    <span className="text-lg grayscale opacity-40">{icon}</span>
                  ) : (
                    <span className={isCurrent ? "text-lg" : ""}>{icon}</span>
                  )}

                  {isCompleted && (
                    <div className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </div>

                {isCurrent && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                    This Week
                  </span>
                )}

                <p
                  className={`mt-2 text-xs font-medium leading-tight ${
                    isFuture ? "text-neutral-300" : "text-neutral-700"
                  }`}
                >
                  {topic}
                </p>
                <p
                  className={`mt-0.5 text-[10px] ${
                    isFuture ? "text-neutral-200" : "text-neutral-400"
                  }`}
                >
                  Week {week}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* CompTIA Tech+ — Current course */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-neutral-900">
            CompTIA Tech+ Foundations
          </h2>
          {techStarted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              Starts April 1
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          7-week certification course{techStarted ? ` · Week ${techWeek} of 7` : " · with Kobie Joyner"}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TECH_WEEKS.map(({ week, topic, icon }) => {
            const isCompleted = techStarted && week < techWeek;
            const isCurrent = techStarted && week === techWeek;
            const isFuture = !techStarted || week > techWeek;

            return (
              <Link
                key={week}
                href={`/dashboard/schedule?week=${week}`}
                className={`group relative flex flex-col items-center rounded-xl border p-5 text-center transition-all ${
                  isCurrent
                    ? "border-neutral-900 bg-white shadow-sm"
                    : isCompleted
                      ? "border-neutral-200 bg-white hover:border-neutral-300"
                      : "border-neutral-100 bg-neutral-50 hover:border-neutral-200"
                }`}
              >
                <div
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                    isCompleted
                      ? "bg-green-50"
                      : isCurrent
                        ? "bg-neutral-900"
                        : "bg-neutral-100"
                  }`}
                >
                  {isFuture ? (
                    <span className="text-lg grayscale opacity-40">{icon}</span>
                  ) : (
                    <span className={isCurrent ? "text-lg" : ""}>{icon}</span>
                  )}

                  {isCompleted && (
                    <div className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </div>

                {isCurrent && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                    This Week
                  </span>
                )}

                <p
                  className={`mt-2 text-xs font-medium leading-tight ${
                    isFuture ? "text-neutral-300" : "text-neutral-700"
                  }`}
                >
                  {topic}
                </p>
                <p
                  className={`mt-0.5 text-[10px] ${
                    isFuture ? "text-neutral-200" : "text-neutral-400"
                  }`}
                >
                  Week {week}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
