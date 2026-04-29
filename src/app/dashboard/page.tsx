import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { computeCurrentWeek } from "@/lib/utils";
import Link from "next/link";
import { WelcomeVideo } from "@/components/welcome-video";
import { OnboardingForm } from "@/components/onboarding-form";
import { DashboardBodySkeleton } from "@/components/dashboard-skeleton";
import { getProgram } from "@/lib/programs/server";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { canAccessAdminPanel } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const program = await getProgram();

  // Defense-in-depth: programs with no tracks (e.g. Catalyst) don't have a
  // learner dashboard. Middleware normally redirects these off /dashboard,
  // but a cached response or misrouted request could still land here with a
  // student record from another program — which would render the wrong UI.
  if (program.tracks.length === 0) {
    const survey = program.surveys?.[0];
    redirect(survey ? `/survey/${survey.id}` : "/");
  }

  // Container lives at the page level so the skeleton and the loaded
  // content share the exact same width + padding. Without this, the
  // skeleton renders full-body-width and the real content snaps inward
  // to max-w-2xl when it finishes streaming.
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardContent program={program} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ program }: { program: ProgramConfig }) {
  let firstName = "there";
  let lastName = "";
  let cohortName = program.defaultCohort.displayName;
  let cohortStartDate = program.defaultCohort.startDate;
  let noCohort = false;
  let needsOnboarding = false;
  let needsProfileStep = true;
  let enrolledTrackSlugs: string[] = [];
  let pendingSurveys: { id: string; title: string; description: string }[] = [];
  let announcements: { id: string; message: string; track_slug: string | null; created_at: string }[] = [];
  let userRole = "student";

  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");

    const { userId, student } = ctx;
    const supabase = await createClient();

    userRole = student?.role ?? "student";
    const cohort = student?.cohorts ?? null;
    const hasCohortId = !!student?.cohort_id;

    firstName = student?.first_name || "there";
    lastName = student?.last_name || "";
    const profileDone = !!student?.onboarding_completed;
    const welcomeDone = !!student?.welcome_seen_at;
    needsOnboarding = !profileDone || !welcomeDone;
    needsProfileStep = !profileDone;

    const isAdminUser = canAccessAdminPanel(userRole);
    const needsSurveys = !!program.surveys?.length;

    const [defaultCohortRes, trackRowsRes, completedSurveysRes] = await Promise.all([
      hasCohortId
        ? Promise.resolve({ data: null })
        : supabase
            .from("cohorts")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
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

    if (!hasCohortId && defaultCohortRes.data) {
      // Fire-and-forget: catch up the student's cohort_id. Not awaited because
      // no downstream render depends on it.
      void supabase
        .from("students")
        .update({ cohort_id: defaultCohortRes.data.id })
        .eq("id", userId);
    }

    if (cohort) {
      cohortName = cohort.display_name || cohort.name;
      cohortStartDate = cohort.start_date;
    } else if (!hasCohortId && !defaultCohortRes.data) {
      noCohort = true;
    }

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

    // Hard gate: profile done + required surveys pending → redirect to survey
    if (profileDone && pendingSurveys.length > 0 && !isAdminUser) {
      redirect(`/dashboard/survey/${pendingSurveys[0].id}`);
    }

    const { data: announcementRows } = await supabase
      .from("announcements")
      .select("id, message, track_slug, created_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    announcements = announcementRows ?? [];
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

  void cohortStartDate;

  const isAdmin = canAccessAdminPanel(userRole);
  const visibleTracks = isAdmin
    ? program.tracks
    : program.tracks.filter((t) => enrolledTrackSlugs.includes(t.slug));
  const notEnrolled = !isAdmin && visibleTracks.length === 0;

  const now = new Date();
  const trackStates = visibleTracks.map((track) => {
    const started = now >= new Date(track.startDate);
    const currentWeek = started
      ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
      : 0;
    return { track, started, currentWeek };
  });

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-700">
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
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-neutral-700">You&apos;re signed in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {needsOnboarding && (
        <OnboardingForm
          defaultFirstName={firstName}
          defaultLastName={lastName}
          program={program}
          visibleTracks={visibleTracks}
          hasPendingSurveys={pendingSurveys.length > 0}
          profileDone={!needsProfileStep}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{cohortName}</p>
      </div>

      {announcements.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-blue-900">{a.message}</p>
              {a.track_slug && (
                <p className="mt-1 text-xs text-blue-600">
                  {program.tracks.find((t) => t.slug === a.track_slug)?.shortName}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {pendingSurveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

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

      {program.welcomeVideo && (
        <WelcomeVideo
          videoSrc={program.welcomeVideo}
          title={`Welcome to ${program.name}`}
          presenter={program.welcomeVideoPresenter}
        />
      )}

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
