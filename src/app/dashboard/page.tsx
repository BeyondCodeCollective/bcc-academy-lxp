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
import { WeekIcon } from "@/components/week-icon";
import { DashboardBento } from "@/components/dashboard-bento";
import { MyProgressCard, type MyProgressCardProps } from "@/components/my-progress-card";
import { getLearnerProgress } from "@/lib/learner-progress";
import { getWhatsNew, type FeedItem } from "@/lib/whats-new";
import { WhatsNew } from "@/components/whats-new";
import { PageHeader } from "@/components/page-header";
import { BCC_INTAKE_SURVEY_ID, surveySkippedForTracks } from "@/lib/surveys/platform";
import { isSurveyEnabledForLearner } from "@/lib/surveys/features";
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

  // Admins land on the admin panel, not the learner home — Home IS the admin
  // dashboard for staff. The learner "Your sessions" home is for enrolled
  // learners; admins see it by switching to student/preview mode (which sets
  // a preview slug, so this redirect doesn't fire).
  if (isAdmin && !previewSlugTop) {
    redirect("/dashboard/admin");
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
  let learnerProgress: MyProgressCardProps | null = null;
  let pendingSurveys: { id: string; title: string; description: string }[] = [];
  let assessmentEnabled = false;
  let assessmentCompleted = false;
  // Enrollments whose track belongs to a different program than the current
  // session — e.g. a Forte AI Literacy student also enrolled in a Catalyst
  // track. Rendered as a separate course list with a program switch.
  let otherProgramCourses: {
    track: TrackConfig;
    programName: string;
  }[] = [];
  // Logged-in user id, hoisted for the "What's New" feed (built below, after
  // tracks resolve). Null for demo sessions.
  let feedUserId: string | null = null;

  if (!currentUser.isDemo) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");

    const { userId, student } = ctx;
    feedUserId = userId;

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

      const [defaultCohortRes, enrolledTracks, completedSurveysRes, allTrackRowsRes] = await Promise.all([
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
            .from("student_tracks")
            .select("track_slug")
            .eq("student_id", userId),
      ]);

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
        // Dedupe by track slug — defensive against any stray duplicate
        // enrollment rows so a course never renders twice.
        const otherSlugs = Array.from(
          new Set((allTrackRowsRes.data ?? []).map((r) => r.track_slug as string)),
        );
        otherProgramCourses = otherSlugs
          .filter((s) => !program.tracks.some((t) => t.slug === s))
          .map((s) => {
            const home = getHomeProgramForTrack(s);
            const track = home?.tracks.find((t) => t.slug === s);
            return home && track ? { track, programName: home.name } : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);
      }

      if (!previewSlug) {
        const completedTypes = new Set(
          (completedSurveysRes.data ?? []).map((r) => r.survey_type)
        );
        const isStaff = isStaffEmail(currentUser.email ?? null);

        // Intake survey is OPT-IN — only fires when toggled on for this program
        // or one of the learner's tracks (admin Features page), same as the
        // pathway assessment. Off by default.
        const surveyEnabled = await isSurveyEnabledForLearner(program.slug, enrolledTrackSlugs);
        if (
          !isStaff &&
          surveyEnabled &&
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

          // Allowlist tracks too: a just-registered learner's enrollment may not
          // have completed yet, but their allowlist reflects what they signed up
          // for — so an event-course registrant (game-on) skips the cohort survey.
          const allowlistTrackSlugs: string[] = [];
          if (currentUser.email) {
            const svc = createServiceClient();
            const { data: allowRows } = await svc
              .from("allowed_signup_emails")
              .select("track_slug")
              .eq("email", currentUser.email.toLowerCase());
            for (const row of allowRows ?? []) {
              allowlistTrackSlugs.push(row.track_slug as string);
              const home = getHomeProgramForTrack(row.track_slug as string)?.slug;
              if (home) enrolledHomePrograms.add(home);
            }
          }
          const surveyTrackSlugs = [...enrolledTrackSlugs, ...allowlistTrackSlugs];

          pendingSurveys = program.surveys
            .filter((s) => {
              if (!s.required || completedTypes.has(s.id)) return false;
              if (s.skipForPrograms?.some((p) => enrolledHomePrograms.has(p))) return false;
              if (surveySkippedForTracks(s.skipForTracks, surveyTrackSlugs)) return false;
              return true;
            })
            .map((s) => ({ id: s.id, title: s.title, description: s.description }));

          // Opt-in: only auto-redirect to a required cohort survey when the
          // program/track has survey_enabled on (Tools/Features page). Off by default.
          if (pendingSurveys.length > 0 && surveyEnabled) {
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

  // Single-course students never see the bare dashboard home — their course
  // overview IS their home. Land them there consistently, every time (email
  // login, clicking Home, returning later), so they don't get a one-time
  // "Welcome back" shell they then never see again. The overview page is an
  // oriented landing (curriculum-at-a-glance week grid + "Open Week N" CTA),
  // not a deep drop into a lesson.
  // Held back while an enabled pathway assessment is incomplete (its prompt
  // renders here) or when the student also has courses in other programs (the
  // cross-program list renders here and would otherwise never be seen).
  if (
    !isAdmin &&
    visibleTracks.length === 1 &&
    otherProgramCourses.length === 0 &&
    (!assessmentEnabled || assessmentCompleted)
  ) {
    redirect(singleCourseDestination(visibleTracks[0], false));
  }

  // Real engagement card — streak + lessons watched + last active, across every
  // course the learner is enrolled in. Fetched only once we know the home will
  // actually render (past the single-course redirect) and never in
  // preview-as-student, where the data would be the admin's own activity.
  if (feedUserId && !isAdmin && !previewSlugOuter) {
    const progressSlugs = Array.from(
      new Set([
        ...enrolledTrackSlugs,
        ...otherProgramCourses.map((c) => c.track.slug),
      ]),
    );
    learnerProgress = await getLearnerProgress(feedUserId, progressSlugs);
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

  // "What's New" feed — announcements + instructor feedback + upcoming office
  // hours, consolidated across the learner's courses (replaces the old
  // announcement banners). Admins get the regular management surfaces instead.
  const feedTracks = [...visibleTracks, ...otherProgramCourses.map((c) => c.track)];
  let whatsNew: FeedItem[] = [];
  if (!isAdmin && feedUserId && feedTracks.length > 0) {
    const svcFeed = createServiceClient();
    const { data: progRow } = await svcFeed
      .from("programs")
      .select("id")
      .eq("slug", program.slug)
      .maybeSingle<{ id: string }>();
    if (progRow) {
      whatsNew = await getWhatsNew({
        userId: feedUserId,
        programId: progRow.id,
        tracks: feedTracks,
        includeTrackName: true,
        now,
      }).catch(() => []);
    }
  }

  if (noCohort) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-ink">
            You&apos;re signed in &mdash; your cohort hasn&apos;t started yet.
          </p>
        </div>
        <div className="panel p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-muted-bg text-2xl">
            <WeekIcon
              icon={program.tracks[0]?.weekSummaries[0]?.icon ?? "📚"}
              emoji={program.tracks[0]?.emojiIcons}
              size={26}
            />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">
            Hang tight!
          </h2>
          <p className="mt-2 text-sm text-ink-soft max-w-sm mx-auto">
            Your program cohort is being set up. You&apos;ll see your full dashboard here once it&apos;s ready.
          </p>
        </div>
      </div>
    );
  }

  if (notEnrolled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{program.name}</p>
        </div>

        <div className="panel p-6 sm:p-8">
          <p className="text-sm text-ink">Your track is being finalized.</p>
          <p className="mt-1 text-sm text-ink-soft">
            You&apos;ll see your dashboard here shortly.
          </p>
        </div>
      </div>
    );
  }

  // Bento tiles for the learner home: weekly tracks ordered started-first
  // then by length, the active one becomes the hero.
  const bentoTracks = trackStates
    .filter(({ track }) => track.type !== "single-event")
    .sort((a, b) =>
      a.started === b.started ? b.track.totalWeeks - a.track.totalWeeks : a.started ? -1 : 1,
    )
    .map(({ track, started, currentWeek }) => ({
      slug: track.slug,
      name: track.name,
      instructor: track.instructor,
      totalWeeks: track.totalWeeks,
      currentWeek: currentWeek || 1,
      started,
      currentTopic:
        track.weekSummaries[(currentWeek || 1) - 1]?.topic ??
        track.weekSummaries[0]?.topic ??
        "",
    }));
  const bentoOtherCourses = otherProgramCourses.map((c) => ({
    trackSlug: c.track.slug,
    trackName: c.track.name,
    instructor: c.track.instructor,
    programName: c.programName,
  }));

  return (
    <div className="space-y-8 sm:space-y-10">
      {needsOnboarding && (
        <OnboardingForm
          program={program}
          // "Here's what you're signed up for" must list ALL enrollments —
          // including tracks from other programs — or the modal's contents
          // change depending on which program cookie the session holds.
          visibleTracks={[
            ...visibleTracks,
            ...otherProgramCourses.map((c) => c.track),
          ]}
        />
      )}

      <div>
        <PageHeader
          title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
          subtitle={
            !isAdmin && !previewSlugOuter
              ? visibleTracks.length > 0 || otherProgramCourses.length > 0
                ? [...visibleTracks, ...otherProgramCourses.map((c) => c.track)]
                    .map((t) => t.name)
                    .join(" · ")
                : cohortName
              : undefined
          }
        />
        {previewSlugOuter && (
          <p className="mt-1.5 text-sm font-medium text-primary">
            Previewing as student enrolled in{" "}
            {program.tracks.find((t) => t.slug === previewSlugOuter)?.name}
          </p>
        )}
      </div>

      <WhatsNew items={whatsNew} />

      {learnerProgress && <MyProgressCard {...learnerProgress} />}

      {pendingSurveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

      {!isAdmin && assessmentEnabled && !assessmentCompleted && (
        <div className="rounded-lg bg-accent/10 border border-accent/20 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink text-sm">Complete your pathway profile</p>
            <p className="text-xs text-ink/60 mt-0.5">Takes about 10–15 minutes. Helps us give you better support.</p>
          </div>
          <a
            href="/dashboard/assessment"
            className="flex-shrink-0 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2"
          >
            Start
          </a>
        </div>
      )}

      {program.welcomeVideo && (
        <WelcomeVideo
          videoSrc={program.welcomeVideo}
          title={`Welcome to ${program.name}`}
          presenter={program.welcomeVideoPresenter}
        />
      )}

      {/* Learner home: bento composition (hero course + progress + quick
         tiles) for everyone, admins included — your personal /dashboard is
         a learner surface. The filterable management grid lives in the admin
         panel. Fallback to the grid only when there are no weekly tracks to
         build a bento from (e.g. an admin not enrolled in any course). */}
      {bentoTracks.length > 0 ? (
        <DashboardBento
          tracks={bentoTracks}
          otherCourses={bentoOtherCourses}
          programName={program.name}
        />
      ) : (
        trackStates.filter(({ track }) => track.type !== "single-event").length > 0 && (
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
        )
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


/**
 * Where a single-course learner lands. ONE place for the week-vs-overview
 * decision so the callback / dashboard / layout can't disagree.
 *   • fromLogin (fresh email magic-link, ?setup=1) → the live week (the
 *     session/Zoom) — fewest clicks to content. Returning mid-cohort students
 *     hit the current calendar week; not-yet-started / self-paced → Week 1.
 *   • any other visit (Home click, admin preview) → the course overview.
 * Clamped to an existing week so a config mismatch can't loop /dashboard.
 */
function singleCourseDestination(track: TrackConfig, fromLogin: boolean): string {
  if (fromLogin) {
    const started = !track.startDateTbd && new Date() >= new Date(track.startDate);
    const week =
      started && !track.selfPaced
        ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
        : 1;
    if (track.weeks.some((w) => w.week === week)) {
      return `/dashboard/track/${track.slug}/${week}`;
    }
  }
  return `/dashboard/track/${track.slug}`;
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
        <h2 className="text-[15px] font-semibold text-ink leading-snug truncate">
          {track.name}
        </h2>
      </div>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        with {track.instructor}
      </p>
    </Link>
  );
}
