import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { computeCurrentWeek } from "@/lib/utils";
import Link from "next/link";
import type { Student, Cohort } from "@/lib/types";

const WEEKS: { week: number; topic: string; icon: string }[] = [
  { week: 1, topic: "Storytelling + IT Fundamentals", icon: "💻" },
  { week: 2, topic: "Networking + Devices & OS", icon: "🖥️" },
  { week: 3, topic: "Self-Advocacy + Networking", icon: "🌐" },
  { week: 4, topic: "Guest Speaker + Cybersecurity", icon: "🔒" },
  { week: 5, topic: "Planning + Software & Data", icon: "🗄️" },
  { week: 6, topic: "Guest Speaker + Cloud & Support", icon: "☁️" },
  { week: 7, topic: "Financial Confidence + Cert Review", icon: "🏆" },
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
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: student } = await supabase
      .from("students")
      .select("first_name, cohort_id")
      .eq("id", user.id)
      .single<Pick<Student, "first_name" | "cohort_id">>();

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

    if (cohortId) {
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("*")
        .eq("id", cohortId)
        .single<Cohort>();

      if (cohort) {
        cohortName = cohort.display_name || cohort.name;
        currentWeek = computeCurrentWeek(cohort.start_date, cohort.total_weeks);
        totalWeeks = cohort.total_weeks;
      } else {
        noCohort = true;
      }
    } else {
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

  const completedWeeks = currentWeek - 1;
  const pct = Math.round((completedWeeks / totalWeeks) * 100);

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
              {completedWeeks} of {totalWeeks} weeks completed
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
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex justify-center w-full bg-neutral-900">
          <video
            src="/atg-intro.mp4"
            controls
            playsInline
            preload="metadata"
            poster=""
            className="w-full max-h-[480px] object-contain"
          />
        </div>
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-neutral-900">
            Welcome to After The Game
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            A message from Ramon Clemente
          </p>
        </div>
      </div>

      {/* Getting Started */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Getting Started
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "MASS Kickoff", subtitle: "with Angel Aviles", icon: "🚀", sessionId: "demo-w1-s1" },
            { title: "MASS Overview", subtitle: "Clarity · Courage · Confidence", icon: "🎯", sessionId: "demo-w1-s2" },
          ].map((item) => (
            <Link
              key={item.title}
              href={`/dashboard/schedule/${item.sessionId}`}
              className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-5 text-center transition-all hover:border-neutral-300 hover:shadow-sm"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
                {item.icon}
              </div>
              <p className="mt-3 text-xs font-medium text-neutral-700">
                {item.title}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-400">
                {item.subtitle}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* CompTIA Tech+ — Current course */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-neutral-900">
            CompTIA Tech+ Foundations
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
            Active
          </span>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          7-week certification course · {completedWeeks} / {totalWeeks} complete
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {WEEKS.map(({ week, topic, icon }) => {
            const isCompleted = week < currentWeek;
            const isCurrent = week === currentWeek;
            const isFuture = week > currentWeek;

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

      {/* What's Next */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">
          What&apos;s Next
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          Your journey continues after Tech+
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              title: "Business Fundamentals",
              subtitle: "Entrepreneurship & Strategy",
              icon: "📊",
            },
            {
              title: "CompTIA Network+",
              subtitle: "Next Certification",
              icon: "🌐",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl grayscale opacity-50">
                {item.icon}
              </div>
              <p className="mt-3 text-xs font-medium text-neutral-400">
                {item.title}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-300">
                {item.subtitle}
              </p>
              <span className="mt-2 text-[9px] font-medium text-neutral-300 uppercase tracking-wide">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
