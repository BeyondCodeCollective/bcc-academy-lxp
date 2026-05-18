import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { computeCurrentWeek } from "@/lib/utils";
import Link from "next/link";
import { WelcomeVideo } from "@/components/welcome-video";
import { OnboardingForm } from "@/components/onboarding-form";
import { LunchLearnHub } from "@/components/lunch-learn-hub";
import { TrackGrid } from "@/components/track-grid";
import { getProgram } from "@/lib/programs/server";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { canAccessAdminPanel } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { resolveCurrentUser } from "@/lib/current-user";
import { getEnrolledTracks } from "@/lib/enrollment";
import { BCC_INTAKE_SURVEY_ID, BCC_INTAKE_EXEMPT_PROGRAMS } from "@/lib/surveys/platform";
import { isStaffEmail } from "@/lib/auth/admins";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const program = await getProgram();

  // Staff users (BGC/BCC employees, not admins) see the Lunch & Learns hub
  // directly when they hit /dashboard — they have no tracks to land on, and
  // the L&L grid is their actual home. Admins still see the regular dashboard.
  const ctx = await getSessionContext();
  const role = ctx?.student?.role ?? "";
  const email = ctx?.student?.email ?? ctx?.userEmail ?? null;
  const isAdmin = canAccessAdminPanel(role);
  const previewSlugTop = await getPreviewTrackSlug(role);
  const previewingLunchLearns = previewSlugTop === LUNCH_LEARN_PREVIEW_SLUG;
  if ((!isAdmin && isStaffEmail(email)) || previewingLunchLearns) {
    const firstName = ctx?.student?.first_name || "";
    return <LunchLearnHub isAdmin={false} firstName={firstName} />;
  }

  // Defense-in-depth: programs with no tracks (e.g. Catalyst marketing apex)
  // don't have a learner dashboard. Middleware normally redirects these off
  // /dashboard, but a cached response or misrouted request could still land
  // here with a student record from another program — which would render the
  // wrong UI.
  if (program.tracks.length === 0) {
    if (isAdmin) {
      redirect("/dashboard/admin");
    }
    // Marketing domain (bccacademy.io) has no tracks. If a non-admin
    // lands here without a program-override cookie, redirecting to "/"
    // creates an infinite loop (proxy sends authed users from "/" back
    // to "/dashboard"). Send them to the login page instead.
    if (program.slug === "marketing") {
      redirect("/login?status=not-enrolled");
    }
    const survey = program.surveys?.[0];
    redirect(survey ? `/survey/${survey.id}` : "/");
  }

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8">
      <DashboardContent program={program} />
    </div>
  );
}

async function DashboardContent({ program }: { program: ProgramConfig }) {
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  let firstName = currentUser.firstName;
  let userRole = currentUser.userRole;
  let cohortName = program.defaultCohort.displayName;
  let cohortStartDate = program.defaultCohort.startDate;
  let noCohort = false;
  let needsOnboarding = false;
  let enrolledTrackSlugs: string[] = [];
  let pendingSurveys: { id: string; title: string; description: string }[] = [];
  let announcements: { id: string; message: string; track_slug: string | null; created_at: string }[] = [];

  if (!currentUser.isDemo) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");

    const { userId, student } = ctx;
    const supabase = await createClient();

    const cohort = student?.cohorts ?? null;
    const hasCohortId = !!student?.cohort_id;

    const welcomeDone = !!student?.welcome_seen_at;
    needsOnboarding = !welcomeDone;

    const rawPreviewSlug = await getPreviewTrackSlug(userRole);
    const previewSlug =
      rawPreviewSlug && program.tracks.some((t) => t.slug === rawPreviewSlug)
        ? rawPreviewSlug
        : null;
    // In preview-as-student mode, treat the super-admin as a non-admin
    // enrolled in just the previewed track.
    const isAdminUser = canAccessAdminPanel(userRole) && !previewSlug;

    const [defaultCohortRes, enrolledTracks, completedSurveysRes] = await Promise.all([
      hasCohortId
        ? Promise.resolve({ data: null })
        : supabase
            .from("cohorts")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
      isAdminUser
        ? Promise.resolve([])
        : getEnrolledTracks(supabase, userId, program),
      // Always fetch for students — needed for BCC intake gate + program survey gate.
      isAdminUser
        ? Promise.resolve({ data: null })
        : supabase
            .from("survey_responses")
            .select("survey_type")
            .eq("student_id", userId)
            .not("completed_at", "is", null),
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
      enrolledTrackSlugs = previewSlug
        ? [previewSlug]
        : enrolledTracks.map((t) => t.slug);
    }

    // Survey gates only apply to actual students, not preview mode.
    if (!isAdminUser && !previewSlug) {
      const completedTypes = new Set(
        (completedSurveysRes.data ?? []).map((r) => r.survey_type)
      );
      const isStaff = isStaffEmail(currentUser.email ?? null);

      if (
        !isStaff &&
        !BCC_INTAKE_EXEMPT_PROGRAMS.includes(program.slug) &&
        !completedTypes.has(BCC_INTAKE_SURVEY_ID)
      ) {
        redirect(`/dashboard/survey/${BCC_INTAKE_SURVEY_ID}`);
      }

      if (!isStaff && program.surveys?.length) {
        pendingSurveys = program.surveys
          .filter((s) => s.required && !completedTypes.has(s.id))
          .map((s) => ({ id: s.id, title: s.title, description: s.description }));

        if (pendingSurveys.length > 0) {
          redirect(`/dashboard/survey/${pendingSurveys[0].id}`);
        }
      }
    }

    const { data: announcementRows } = await supabase
      .from("announcements")
      .select("id, message, track_slug, created_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    announcements = announcementRows ?? [];
  }

  void cohortStartDate;

  const rawPreviewSlugOuter = await getPreviewTrackSlug(userRole);
  const previewSlugOuter =
    rawPreviewSlugOuter && program.tracks.some((t) => t.slug === rawPreviewSlugOuter)
      ? rawPreviewSlugOuter
      : null;
  const isAdmin = canAccessAdminPanel(userRole) && !previewSlugOuter;
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
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
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
    const firstTrack = program.tracks[0];
    const startDate = firstTrack
      ? new Date(firstTrack.startDate)
      : null;
    const hasStarted = startDate ? startDate <= new Date() : false;
    const formattedStart = startDate?.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{program.name}</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
            {firstTrack?.weekSummaries[0]?.icon ?? "🎓"}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-neutral-900">
            {hasStarted ? "You’re registered!" : "You’re in!"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            {hasStarted
              ? "Your track enrollment is being finalized. You’ll see your full dashboard here shortly."
              : formattedStart
                ? `${program.name} kicks off ${formattedStart}. We’ll send you everything you need before then.`
                : `${program.name} is coming soon. We’ll let you know when it’s time to start.`}
          </p>
        </div>

        {firstTrack && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              What you&apos;ll cover
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {firstTrack.weekSummaries.slice(0, 10).map((ws) => (
                <div
                  key={ws.week}
                  className="flex flex-col items-center rounded-lg bg-neutral-50 p-3 text-center"
                >
                  <span className="text-lg">{ws.icon}</span>
                  <span className="mt-1 text-[11px] font-medium text-neutral-900">
                    {ws.topic}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Week {ws.week}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {needsOnboarding && (
        <OnboardingForm
          program={program}
          visibleTracks={visibleTracks}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          Welcome back, {firstName}
        </h1>
        {!isAdmin && !previewSlugOuter && (
          <p className="mt-1 text-sm text-neutral-500">{cohortName}</p>
        )}
        {previewSlugOuter && (
          <p className="mt-1 text-sm text-[#E54D2E]">
            Previewing as student enrolled in{" "}
            {program.tracks.find((t) => t.slug === previewSlugOuter)?.name}
          </p>
        )}
      </div>

      {announcements.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border-l-2 border-blue-500 bg-blue-50 px-4 py-3 sm:px-5 sm:py-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700 mb-1">
            {a.track_slug
              ? program.tracks.find((t) => t.slug === a.track_slug)?.shortName ?? "Announcement"
              : "Announcement"}
          </p>
          <p className="text-sm text-blue-900 leading-relaxed">{a.message}</p>
        </div>
      ))}

      {pendingSurveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

      {!isAdmin && (
        <section aria-label="Program progress">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-semibold text-ink">
              Week {progressWeek} of {totalProgramWeeks}
            </p>
            <span className="text-sm font-semibold tabular-nums text-ink-soft">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule">
            <div
              className="h-full rounded-full bg-ink transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      {program.welcomeVideo && (
        <WelcomeVideo
          videoSrc={program.welcomeVideo}
          title={`Welcome to ${program.name}`}
          presenter={program.welcomeVideoPresenter}
        />
      )}

      {/* Weekly track cards — typography-led with per-track color band.
         Single-event tracks keep their inline row treatment since they
         don't have weeks to navigate into. */}
      {trackStates.filter(({ track }) => track.type !== "single-event").length > 0 && (
        <TrackGrid
          tracks={trackStates
            .filter(({ track }) => track.type !== "single-event")
            .map(({ track, started, currentWeek }) => ({
              track: {
                slug: track.slug,
                name: track.name,
                instructor: track.instructor,
                totalWeeks: track.totalWeeks,
                sessionsPerWeek: track.sessionsPerWeek,
                startDate: track.startDate,
                weekOneTopic: track.weekSummaries[0]?.topic ?? "",
                phase: track.phase,
              },
              started,
              currentWeek,
            }))}
        />
      )}
      {/* Upcoming single-event tracks only. Past events read as orphans on
         the dashboard — they have no week to navigate into and no ongoing
         action — so hide them once the event date has passed. They remain
         reachable via direct track URL for anyone with the link. */}
      {trackStates
        .filter(({ track }) => track.type === "single-event" && new Date() <= new Date(track.startDate))
        .map(({ track }) => (
          <SingleEventCard key={track.slug} track={track} />
        ))}
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
      className="group block rounded-xl border-l-2 border-amber-500 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 transition-colors hover:bg-amber-100/70"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
          Required survey
        </p>
        <span className="text-xs font-medium text-amber-800 transition-transform group-hover:translate-x-0.5">
          Take it &rarr;
        </span>
      </div>
      <p className="text-sm font-semibold text-amber-900">{survey.title}</p>
      <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
        {survey.description}
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
  const isPast = new Date() > eventDate;

  return (
    <Link
      href={`/dashboard/track/${track.slug}/1`}
      className="group block"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-[15px] font-semibold text-neutral-900 leading-snug truncate">
            {track.name}
          </h2>
          {isPast ? (
            <span className="inline-flex items-center rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 shrink-0">
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#E54D2E] px-2 py-0.5 text-[10px] font-semibold text-white shrink-0">
              Upcoming
            </span>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-[12px] text-neutral-400">
        {dateStr} · with {track.instructor}
      </p>
    </Link>
  );
}
