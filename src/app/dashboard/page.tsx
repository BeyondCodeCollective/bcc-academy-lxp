import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
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
import { getHomeProgramForTrack } from "@/lib/programs";
import { BCC_INTAKE_SURVEY_ID, BCC_INTAKE_EXEMPT_PROGRAMS } from "@/lib/surveys/platform";
import { isStaffEmail } from "@/lib/auth/admins";
import { completePendingSetup } from "@/lib/auth/deferred-setup";
import { isAssessmentEnabledForLearner } from "@/lib/assessment/features";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; track?: string }>;
}) {
  const { setup, track: joinTrack } = await searchParams;
  const program = await getProgram();

  // Staff users (BGC/BCC employees, not admins) see the Lunch & Learns hub
  // directly when they hit /dashboard — they have no tracks to land on, and
  // the L&L grid is their actual home. Admins still see the regular dashboard.
  const ctx = isSupabaseConfigured() ? await getSessionContext() : null;
  const role = ctx?.student?.role ?? "";
  const email = ctx?.student?.email ?? ctx?.userEmail ?? null;
  const isAdmin = canAccessAdminPanel(role);
  const previewSlugTop = await getPreviewTrackSlug(role);
  const previewingLunchLearns = previewSlugTop === LUNCH_LEARN_PREVIEW_SLUG;
  const isUmbrellaProgram = program.slug === "catalyst" || program.slug === "bcc-academy";
  if (previewingLunchLearns || (!isAdmin && isStaffEmail(email) && isUmbrellaProgram)) {
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
      <DashboardContent program={program} setup={setup} joinTrack={joinTrack} />
    </div>
  );
}

async function DashboardContent({
  program,
  setup,
  joinTrack,
}: {
  program: ProgramConfig;
  setup?: string;
  joinTrack?: string;
}) {
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
  let assessmentEnabled = false;
  let assessmentCompleted = false;
  // Enrollments whose track belongs to a different program than the current
  // session — e.g. a Forte AI Literacy student also enrolled in a Catalyst
  // track. Rendered as a separate course list with a program switch.
  let otherProgramCourses: {
    trackSlug: string;
    trackName: string;
    instructor: string;
    programName: string;
  }[] = [];

  if (!currentUser.isDemo) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");

    const { userId, student } = ctx;

    // Deferred setup: cohort, track enrollment, survey claims, welcome email
    // runs on first dashboard paint after login instead of blocking the callback.
    // Triggered by ?setup=1 in the redirect URL from the auth callback — naturally
    // one-time (no persistence on client-side nav or refresh).
    if (setup === "1") {
      await completePendingSetup(
        userId,
        currentUser.email ?? "",
        program,
        joinTrack ?? null,
        student?.cohort_id,
        student?.role ?? "student",
        student?.welcome_seen_at,
      );
    }

    const { cohorts: cohort, cohort_id: cohortId } = student ?? {};
    const hasCohortId = !!cohortId;

    const welcomeDone = !!student?.welcome_seen_at;
    needsOnboarding = !welcomeDone;

    const rawPreviewSlug = await getPreviewTrackSlug(userRole);
    const previewSlug =
      rawPreviewSlug && program.tracks.some((t) => t.slug === rawPreviewSlug)
        ? rawPreviewSlug
        : null;
    const isAdminUser = canAccessAdminPanel(userRole) && !previewSlug;

    // Only non-admin students need Supabase queries — admins see none of
    // this data (cohort, enrollment, surveys, announcements).
    if (!isAdminUser) {
      const supabase = await createClient();

      const [defaultCohortRes, enrolledTracks, completedSurveysRes, announcementsRes, allTrackRowsRes] = await Promise.all([
        hasCohortId
          ? Promise.resolve({ data: null })
          : supabase
              .from("cohorts")
              .select("id")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle(),
        getEnrolledTracks(supabase, userId, program),
        supabase
            .from("survey_responses")
            .select("survey_type")
            .eq("student_id", userId)
            .not("completed_at", "is", null),
        supabase
            .from("announcements")
            .select("id, message, track_slug, created_at")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(5),
        supabase
            .from("student_tracks")
            .select("track_slug")
            .eq("student_id", userId),
      ]);
      announcements = (announcementsRes.data ?? []);

      if (!hasCohortId && defaultCohortRes.data) {
        void supabase
          .from("students")
          .update({ cohort_id: defaultCohortRes.data.id })
          .eq("id", userId);
      }

      if (cohort) {
        cohortName = cohort.display_name || cohort.name;
        cohortStartDate = cohort.start_date ?? cohortStartDate;
      } else if (!hasCohortId && !defaultCohortRes.data) {
        noCohort = true;
      }

      enrolledTrackSlugs = previewSlug
        ? [previewSlug]
        : enrolledTracks.map((t) => t.slug);

      if (!previewSlug) {
        otherProgramCourses = ((allTrackRowsRes.data ?? []) as { track_slug: string }[])
          .map((r) => r.track_slug)
          .filter((s) => !program.tracks.some((t) => t.slug === s))
          .map((s) => {
            const home = getHomeProgramForTrack(s);
            const track = home?.tracks.find((t) => t.slug === s);
            return home && track
              ? {
                  trackSlug: s,
                  trackName: track.name,
                  instructor: track.instructor,
                  programName: home.name,
                }
              : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);
      }

      if (!previewSlug) {
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
          const { getHomeProgramForTrack } = await import("@/lib/programs");

          // Build the set of home programs from enrolled tracks AND the
          // allowlist. Using both sources means a Forte student who ends up
          // on the Catalyst dashboard (wrong cookie, previous Catalyst
          // enrollment, routing race) still has "forte" in the set and the
          // skipForPrograms: ["forte"] check fires correctly.
          const enrolledHomePrograms = new Set(
            enrolledTrackSlugs
              .map((slug) => getHomeProgramForTrack(slug)?.slug)
              .filter((s): s is string => !!s),
          );

          if (currentUser.email) {
            const svc = createServiceClient();
            const { data: allowRows } = await svc
              .from("allowed_signup_emails")
              .select("track_slug")
              .eq("email", currentUser.email.toLowerCase());
            for (const row of allowRows ?? []) {
              const home = getHomeProgramForTrack(row.track_slug as string)?.slug;
              if (home) enrolledHomePrograms.add(home);
            }
          }

          pendingSurveys = program.surveys
            .filter((s) => {
              if (!s.required || completedTypes.has(s.id)) return false;
              if (s.skipForPrograms?.some((p) => enrolledHomePrograms.has(p))) return false;
              return true;
            })
            .map((s) => ({ id: s.id, title: s.title, description: s.description }));

          if (pendingSurveys.length > 0) {
            redirect(`/dashboard/survey/${pendingSurveys[0].id}`);
          }
        }

        // Assessment onboarding prompt — check program OR track-level flag
        assessmentEnabled = await isAssessmentEnabledForLearner(program.slug, enrolledTrackSlugs);
        if (assessmentEnabled) {
          const svcForAssessment = createServiceClient();
          const { count } = await svcForAssessment
            .from("assessment_results")
            .select("*", { count: "exact", head: true })
            .eq("student_id", userId);
          assessmentCompleted = (count ?? 0) > 0;
        }
      }
    }
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

  // Students enrolled in exactly one track skip the track-picker and land
  // directly on that track — one less click. Held back while an enabled
  // pathway assessment is incomplete (its prompt renders here) or when the
  // student also has courses in other programs (the cross-program list
  // renders here and would otherwise never be seen). Announcements also
  // render on the track overview page, so skipping doesn't hide them.
  // Admin preview mode keeps the dashboard reachable for inspection.
  if (
    !isAdmin &&
    !previewSlugOuter &&
    visibleTracks.length === 1 &&
    otherProgramCourses.length === 0 &&
    (!assessmentEnabled || assessmentCompleted)
  ) {
    redirect(`/dashboard/track/${visibleTracks[0].slug}`);
  }

  const now = new Date();
  const trackStates = visibleTracks.map((track) => {
    const started = !track.startDateTbd && now >= new Date(track.startDate);
    const currentWeek = track.selfPaced
      ? started ? 1 : 0
      : started
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
        <div className="border border-rule bg-surface-elevated p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-muted-bg text-2xl">
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

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{program.name}</p>
        </div>

        <div className="border border-rule bg-surface-elevated p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-muted-bg text-2xl">
            {firstTrack?.weekSummaries[0]?.icon ?? "🎓"}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-neutral-900">
            You&apos;re in!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Your track enrollment is being finalized. You&apos;ll see your full dashboard here shortly.
          </p>
        </div>

        {firstTrack && (
          <div className="border border-rule bg-surface-elevated p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              What you&apos;ll cover
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {firstTrack.weekSummaries.slice(0, 10).map((ws) => (
                <div
                  key={ws.week}
                  className="flex flex-col items-center bg-muted-bg p-3 text-center"
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
          <p className="mt-1 text-sm text-neutral-500">
            {visibleTracks.length > 0
              ? visibleTracks.map((t) => t.name).join(" · ")
              : cohortName}
          </p>
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
          className="border-l-2 border-blue-500 bg-blue-50 px-4 py-3 sm:px-5 sm:py-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700 mb-1">
            {a.track_slug
              ? program.tracks.find((t) => t.slug === a.track_slug)?.shortName ?? "Announcement"
              : "Announcement"}
          </p>
          <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{a.message}</p>
        </div>
      ))}

      {pendingSurveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

      {!isAdmin && assessmentEnabled && !assessmentCompleted && (
        <div className="rounded-2xl bg-accent/10 border border-accent/20 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink text-sm">Complete your pathway profile</p>
            <p className="text-xs text-ink/60 mt-0.5">Takes about 10–15 minutes. Helps us give you better support.</p>
          </div>
          <a
            href="/dashboard/assessment"
            className="flex-shrink-0 rounded-xl bg-accent text-white text-sm font-semibold px-4 py-2"
          >
            Start
          </a>
        </div>
      )}

      {!isAdmin && (
        <section aria-label="Program progress">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-semibold text-ink">Progress</p>
            <span className="text-sm font-semibold tabular-nums text-ink-soft">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden bg-rule">
            <div
              className="h-full bg-primary transition-all"
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
            .map(({ track, started }) => ({
              track: {
                slug: track.slug,
                name: track.name,
                instructor: track.instructor,
                totalWeeks: track.totalWeeks,
                sessionsPerWeek: track.sessionsPerWeek,
                weekOneTopic: track.weekSummaries[0]?.topic ?? "",
                phase: track.phase,
              },
              started,
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

      {/* Courses from other programs — opening one switches the session's
         program context via /dashboard/switch-program. Plain <a> (not
         <Link>) because the switch route sets cookies; prefetching it
         would flip the program as a side effect. */}
      {otherProgramCourses.length > 0 && (
        <section className="space-y-3" aria-label="Courses from your other programs">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            From your other programs
          </h2>
          <div className="divide-y divide-rule border border-rule bg-surface-elevated">
            {otherProgramCourses.map((c) => (
              <a
                key={c.trackSlug}
                href={`/dashboard/switch-program?track=${encodeURIComponent(c.trackSlug)}`}
                className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                    {c.programName}
                  </p>
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {c.trackName}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    with {c.instructor}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-neutral-400 transition-transform group-hover:translate-x-0.5">
                  Open &rarr;
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
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
      className="group block border-l-2 border-amber-500 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 transition-colors hover:bg-amber-100/70"
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
  return (
    <Link
      href={`/dashboard/track/${track.slug}/1`}
      className="group block"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <h2 className="text-[15px] font-semibold text-neutral-900 leading-snug truncate">
          {track.name}
        </h2>
      </div>
      <p className="mt-0.5 text-[12px] text-neutral-400">
        with {track.instructor}
      </p>
    </Link>
  );
}
