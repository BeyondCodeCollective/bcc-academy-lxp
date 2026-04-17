import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { computeCurrentWeek } from "@/lib/utils";
import Link from "next/link";
import { WelcomeVideo } from "@/components/welcome-video";
import { WelcomeOverlay } from "@/components/welcome-overlay";
import { OnboardingForm } from "@/components/onboarding-form";
import { getProgram } from "@/lib/programs/server";
import type { TrackConfig } from "@/lib/programs/types";
import { canAccessAdminPanel } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";

export default async function DashboardPage() {
  const program = await getProgram();

  let firstName = "there";
  let lastName = "";
  let cohortName = program.defaultCohort.displayName;
  let cohortStartDate = program.defaultCohort.startDate;
  let noCohort = false;
  let needsOnboarding = false;
  let enrolledTrackSlugs: string[] = [];
  let pendingSurveys: { id: string; title: string; description: string }[] = [];
  let userRole = "student";

  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");

    const { userId, student } = ctx;
    const supabase = await createClient();

    userRole = student?.role ?? "student";
    const cohort = student?.cohorts ?? null;
    let cohortId = student?.cohort_id ?? null;

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
          .eq("id", userId);
        cohortId = defaultCohort.id;
      }
    }

    if (cohort) {
      cohortName = cohort.display_name || cohort.name;
      cohortStartDate = cohort.start_date;
    } else if (!cohortId) {
      noCohort = true;
    }

    firstName = student?.first_name || "there";
    lastName = student?.last_name || "";
    needsOnboarding = !student?.onboarding_completed;

    const isAdminUser = canAccessAdminPanel(userRole);
    const needsSurveys = !!program.surveys?.length;

    const [trackRowsRes, completedSurveysRes] = await Promise.all([
      isAdminUser
        ? Promise.resolve({ data: null })
        : supabase.from("student_tracks").select("track_slug").eq("student_id", userId),
      needsSurveys
        ? supabase
            .from("survey_responses")
            .select("survey_type")
            .eq("student_id", userId)
            .not("completed_at", "is", null)
        : Promise.resolve({ data: null }),
    ]);

    if (!isAdminUser) {
      enrolledTrackSlugs = (trackRowsRes.data ?? []).map((r) => r.track_slug);
    }

    if (needsSurveys) {
      const completedTypes = new Set(
        (completedSurveysRes.data ?? []).map((r) => r.survey_type)
      );
      pendingSurveys = program.surveys!
        .filter((s) => s.required && !completedTypes.has(s.id))
        .map((s) => ({ id: s.id, title: s.title, description: s.description }));
    }
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    if (demoEmail) {
      const demoUser = getDemoUser(demoEmail);
      if (demoUser) {
        firstName = demoUser.first_name;
      } else {
        firstName = demoEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  // Admins see all tracks; students see only tracks they're enrolled in
  const isAdmin = canAccessAdminPanel(userRole);
  const visibleTracks = isAdmin
    ? program.tracks
    : program.tracks.filter((t) => enrolledTrackSlugs.includes(t.slug));
  const notEnrolled = !isAdmin && visibleTracks.length === 0;

  // Compute current week per track
  const now = new Date();
  const trackStates = visibleTracks.map((track) => {
    const started = now >= new Date(track.startDate);
    const currentWeek = started
      ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
      : 0;
    return { track, started, currentWeek };
  });

  // Progress: based on the longest weekly track
  const weeklyTracks = trackStates.filter((t) => t.track.type === "weekly");
  const longestTrack = weeklyTracks.reduce<typeof trackStates[0] | null>(
    (best, t) => (!best || t.track.totalWeeks > best.track.totalWeeks ? t : best),
    null
  );
  const completedWeeks = longestTrack ? Math.max(0, longestTrack.currentWeek - 1) : 0;
  const totalProgramWeeks = longestTrack?.track.totalWeeks ?? 8;
  const pct = Math.round((completedWeeks / totalProgramWeeks) * 100);
  const progressWeek = longestTrack?.currentWeek ?? 1;

  if (noCohort) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 sm:px-5 py-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            You&apos;re signed in &mdash; your cohort hasn&apos;t started yet.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
            {program.tracks[0]?.weekSummaries[0]?.icon ?? "📚"}
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

  if (notEnrolled) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">You&apos;re signed in.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 sm:space-y-10 px-4 sm:px-5 py-8">
      {needsOnboarding ? (
        <OnboardingForm defaultFirstName={firstName} defaultLastName={lastName} />
      ) : (
        <WelcomeOverlay firstName={firstName} program={program} visibleTracks={visibleTracks} />
      )}

      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{cohortName}</p>
      </div>

      {/* Pending surveys */}
      {pendingSurveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

      {/* Progress summary */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Your Progress
            </p>
            <p className="text-xs text-neutral-500">
              Week {progressWeek} of {totalProgramWeeks}
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
      {program.welcomeVideo && (
        <WelcomeVideo
          videoSrc={program.welcomeVideo}
          title={`Welcome to ${program.name}`}
          presenter={program.welcomeVideoPresenter}
        />
      )}

      {/* Track sections */}
      {trackStates.map(({ track, started, currentWeek }) =>
        track.type === "single-event" ? (
          <SingleEventCard key={track.slug} track={track} />
        ) : (
          <WeeklyTrackGrid
            key={track.slug}
            track={track}
            started={started}
            currentWeek={currentWeek}
          />
        )
      )}
    </div>
  );
}

function WeeklyTrackGrid({
  track,
  started,
  currentWeek,
}: {
  track: TrackConfig;
  started: boolean;
  currentWeek: number;
}) {
  const startDate = new Date(track.startDate);
  const startLabel = startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-neutral-900">
          {track.name}
        </h2>
        {started ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Starts {startLabel}
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        {track.totalWeeks}-week {track.sessionsPerWeek > 1 ? "course" : "coaching"}
        {started ? ` · Week ${currentWeek} of ${track.totalWeeks}` : ` · with ${track.instructor}`}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {track.weekSummaries.map(({ week, topic, icon }) => {
          const isCompleted = started && week < currentWeek;
          const isCurrent = started && week === currentWeek;
          const isFuture = !started || week > currentWeek;

          return (
            <Link
              key={week}
              href={`/dashboard/track/${track.slug}/${week}`}
              className={`group relative flex flex-col items-center rounded-xl border p-3 sm:p-5 text-center transition-all ${
                isCurrent
                  ? "border-neutral-900 bg-white shadow-sm"
                  : isCompleted
                    ? "border-neutral-200 bg-white hover:border-neutral-300"
                    : "border-neutral-100 bg-neutral-50 hover:border-neutral-200"
              }`}
            >
              <div
                className={`relative flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full text-2xl ${
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
  );
}

function SurveyCard({
  survey,
}: {
  survey: { id: string; title: string; description: string };
}) {
  return (
    <Link
      href={`/dashboard/survey/${survey.id}`}
      className="block rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 transition-colors hover:border-amber-300 hover:bg-amber-100/60"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">
          <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-900">
              {survey.title}
            </p>
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Required
            </span>
          </div>
          <p className="mt-0.5 text-xs text-amber-700">
            {survey.description}
          </p>
          <p className="mt-2 text-xs font-medium text-amber-800">
            Take survey &rarr;
          </p>
        </div>
      </div>
    </Link>
  );
}

function SingleEventCard({ track }: { track: TrackConfig }) {
  const eventDate = new Date(track.startDate);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const session = track.weeks[0]?.sessions[0];
  const isPast = new Date() > eventDate;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-neutral-900">{track.name}</h2>
        {isPast ? (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Upcoming
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-400 mb-3">
        {dateStr} · with {track.instructor}
      </p>
      {session && (
        <p className="text-sm text-neutral-600 mb-3">{session.time}</p>
      )}
      <Link
        href={`/dashboard/track/${track.slug}/1`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 transition-colors hover:bg-neutral-800"
      >
        View Details
      </Link>
    </div>
  );
}
