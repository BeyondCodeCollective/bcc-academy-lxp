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
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 sm:px-5 py-12">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-ink">
            Welcome, {firstName}.
          </h1>
          <p className="mt-2 text-base text-ink-muted">
            You&apos;re signed in &mdash; your cohort hasn&apos;t started yet.
          </p>
        </div>
        <div className="rounded-2xl border border-rule bg-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-paper-deep text-2xl">
            {program.tracks[0]?.weekSummaries[0]?.icon ?? "📚"}
          </div>
          <h2 className="mt-4 font-display text-xl font-normal text-ink">
            Hang tight.
          </h2>
          <p className="mt-2 text-sm text-ink-muted max-w-sm mx-auto">
            Your program cohort is being set up. You&apos;ll see your full dashboard here once it&apos;s ready.
          </p>
        </div>
      </div>
    );
  }

  if (notEnrolled) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-12">
        <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-ink">
          Welcome, {firstName}.
        </h1>
        <p className="mt-2 text-base text-ink-muted">You&apos;re signed in.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 sm:space-y-12 px-4 sm:px-5 py-12">
      {needsOnboarding ? (
        <OnboardingForm defaultFirstName={firstName} defaultLastName={lastName} />
      ) : (
        <WelcomeOverlay firstName={firstName} program={program} visibleTracks={visibleTracks} />
      )}

      {/* Welcome header — editorial hero */}
      <div className="pt-2">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-3">
          {cohortName}
        </p>
        <h1 className="font-display text-5xl sm:text-6xl font-normal tracking-tight text-ink leading-[1.02]">
          Welcome back,
          <br />
          <span className="text-rust">{firstName}.</span>
        </h1>
      </div>

      {/* Pending surveys */}
      {pendingSurveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

      {/* Progress summary — editorial */}
      <div className="rounded-2xl bg-surface p-6 sm:p-7 ring-1 ring-rule">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Your progress
            </p>
            <p className="mt-1 font-display text-lg text-ink">
              Week {progressWeek} of {totalProgramWeeks}
            </p>
          </div>
          <span className="font-display text-4xl font-normal text-ink tabular-nums">
            {pct}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
          <div
            className="h-full rounded-full bg-rust transition-all"
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
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-ink">
          {track.name}
        </h2>
        {started ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rust">
            <span className="h-1.5 w-1.5 rounded-full bg-rust animate-pulse" />
            Active
          </span>
        ) : (
          <span className="text-[11px] text-ink-muted">
            Starts {startLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted mb-6">
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
              className={`group relative flex flex-col items-center rounded-2xl p-4 sm:p-5 text-center transition-all ${
                isCurrent
                  ? "bg-surface ring-1 ring-rust shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(201,100,66,0.3)]"
                  : isCompleted
                    ? "bg-surface ring-1 ring-rule hover:ring-ink/20"
                    : "bg-paper-deep/60 hover:bg-paper-deep"
              }`}
            >
              <div
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full text-2xl ${
                  isCompleted
                    ? "bg-paper-deep"
                    : isCurrent
                      ? "bg-rust-soft"
                      : "bg-transparent"
                }`}
              >
                {isFuture ? (
                  <span className="text-lg grayscale opacity-30">{icon}</span>
                ) : (
                  <span>{icon}</span>
                )}

                {isCompleted && (
                  <div className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink">
                    <svg className="h-3 w-3 text-paper" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>

              {isCurrent && (
                <span className="mt-2 text-[10px] font-medium uppercase tracking-wider text-rust">
                  This Week
                </span>
              )}

              <p
                className={`mt-2 text-sm font-medium leading-tight ${
                  isFuture ? "text-ink-muted/50" : "text-ink"
                }`}
              >
                {topic}
              </p>
              <p
                className={`mt-1 text-[10px] uppercase tracking-wider ${
                  isFuture ? "text-ink-muted/40" : "text-ink-muted"
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
      className="block rounded-2xl bg-rust-soft/70 p-6 ring-1 ring-rust/20 transition-all hover:bg-rust-soft hover:ring-rust/40"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-xl font-normal text-ink">
          {survey.title}
        </p>
        <span className="text-[10px] uppercase tracking-[0.15em] text-rust font-medium">
          Required
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">
        {survey.description}
      </p>
      <p className="mt-4 text-sm font-medium text-rust">
        Take survey &rarr;
      </p>
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
    <div className="rounded-2xl bg-surface p-6 sm:p-7 ring-1 ring-rule">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-ink">
          {track.name}
        </h2>
        {isPast ? (
          <span className="text-[11px] uppercase tracking-wider text-ink-muted">
            Completed
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-wider text-rust">
            Upcoming
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted mb-1">
        {dateStr} · with {track.instructor}
      </p>
      {session && (
        <p className="text-sm text-ink mb-5">{session.time}</p>
      )}
      <Link
        href={`/dashboard/track/${track.slug}/1`}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper text-sm font-medium px-5 py-2.5 transition-colors hover:bg-ink/90"
      >
        View Details
      </Link>
    </div>
  );
}
