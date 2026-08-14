import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured, createClient, createServiceClient } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { ActivityBeacon } from "@/components/activity-beacon";
import { DashboardTopBar } from "@/components/dashboard-topbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getDashboardIndex } from "@/lib/dashboard-index";
import { TutorFab } from "@/components/tutor-fab";
import { NameCaptureOverlay } from "@/components/name-capture-overlay";
import { ProfileCaptureOverlay } from "@/components/profile-capture-overlay";
import { PreviewToggle } from "@/components/preview-toggle";
import { PreviewBanner } from "@/components/preview-banner";
import { getProgram, getProgramWithOverrides, resolveHomeProgramSlug, fetchDynamicProgram, listDynamicPrograms } from "@/lib/programs/server";
import { getProgramBySlug, getAllPrograms, getJoinablePrograms, isTutorAvailable } from "@/lib/programs";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms, canAccessStaffContent } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getGrantedProgramSlugs } from "@/lib/auth/program-access";
import { getPreviewTrackSlug, getPreviewTrackSlugs, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getMyInstructorTracks } from "@/app/dashboard/admin/actions-tracks";
import { getEnrolledTracks } from "@/lib/enrollment";
import { getHiddenTrackSlugs } from "@/lib/programs/hidden";
import { getLearnerAccess } from "@/lib/auth/active-enrollment";
import { getEnforcedOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
import { BCC_INTAKE_SURVEY_ID, surveySkippedForTracks, surveyAppliesToPrograms, surveyAppliesToTracks } from "@/lib/surveys/platform";
import { collapseCompanionSlugs } from "@/lib/enrollment";
import { isSurveyEnabledForLearner } from "@/lib/surveys/features";
import { isStaffResolved } from "@/lib/auth/staff";
import { getHomeProgramForTrack } from "@/lib/programs";
import { programHasResources } from "@/lib/resources";
import { MARKETING_SLUG } from "@/lib/programs/marketing";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { trackHasStarted } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function NavSkeleton() {
  // Empty light rail — holds the sidebar's space (main is md:pl-60 regardless)
  // and avoids a black flash while the nav streams in, but draws no fake nav
  // items: like the route loaders, a guessed layout reads as a wrong UI when
  // the real nav (per-program items) swaps in. Needs .js-sidebar so the
  // collapsed-rail CSS applies to the fallback too — without it, a collapsed
  // sidebar flashes to full width during program switches, then snaps back.
  return (
    <nav
      className="js-sidebar hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 shell-light items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <Loader2 size={20} className="animate-spin text-ink-faint" />
    </nav>
  );
}

// A logged-in learner enrolled in a real program (e.g. a Catalyst Course-Builder
// track like comptia-security) can land on the bccacademy.io apex — which
// resolves to `marketing` ("BCC Academy") — whenever their program-override
// cookie is missing or stale, showing the wrong brand + an empty learner shell.
// Resolve their program from ENROLLMENT instead, so they always wear their
// actual program's brand regardless of the cookie. Only kicks in on the apex
// (marketing) for a logged-in learner with enrollments; everything else is a
// no-op. (Can't refresh the cookie here — layouts can't set cookies.)
async function resolveLearnerBrand(resolved: ProgramConfig): Promise<ProgramConfig> {
  if (resolved.slug !== MARKETING_SLUG) return resolved;
  const ctx = await getSessionContext();
  if (!ctx?.userId) return resolved;
  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", ctx.userId);
  for (const row of rows ?? []) {
    const slug = (row as { track_slug: string }).track_slug;
    const homeSlug = await resolveHomeProgramSlug(slug);
    if (homeSlug && homeSlug !== MARKETING_SLUG) {
      return getProgramWithOverrides(homeSlug);
    }
  }
  return resolved;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isSurveyPage = pathname.startsWith("/dashboard/survey");
  const programSlug = headersList.get("x-program-slug") ?? "bcc-academy";
  const baseProgram = await resolveLearnerBrand(getProgramBySlug(programSlug));

  // Skin accent follows the program the learner is actually in (the same
  // resolver the nav uses — header-based getProgramBySlug can lag behind and
  // return Catalyst for a Forte student). A per-track override lets a track
  // surfaced inside another program still wear its own home program's accent.
  const activeProgram = await getProgram();
  const trackSlug = pathname.match(/^\/dashboard\/track\/([^/]+)/)?.[1];
  const skinAccent =
    (trackSlug ? getHomeProgramForTrack(trackSlug) : null)?.colors.accent ??
    activeProgram.colors.accent;

  // SECURITY: confine pending registrants to their holding page. A learner whose
  // ONLY enrollment is a not-yet-started course (an event registrant) must not
  // reach program content — Workshops, Resources, AI Tutor, etc. This runs in the
  // layout BODY (not the streamed NavShell), so a direct URL is redirected before
  // any page content streams to the client. Track + survey + settings pages are
  // always allowed (the holding page itself lives under /dashboard/track); admins,
  // staff, and active learners (with a started course) pass through untouched.
  const confineExemptPath =
    isSurveyPage ||
    pathname.startsWith("/dashboard/settings") ||
    // The standalone participation-agreement page is a shareable sign-here link
    // (does its own auth check) — never bounce a learner off it to another gate.
    pathname.startsWith("/dashboard/agreement");
  if (isSupabaseConfigured() && !confineExemptPath) {
    const ctx = await getSessionContext();
    if (ctx) {
      const exempt =
        canAccessAdminPanel(ctx.student?.role ?? "") ||
        isStaffResolved(ctx.student?.is_staff, ctx.student?.email ?? ctx.userEmail);
      if (!exempt) {
        const supabase = await createClient();
        const access = await getLearnerAccess(supabase, ctx.userId, activeProgram);
        if (access.pendingOnly && access.pendingSlug) {
          // Their own courses and the dashboard home are allowed — a learner
          // enrolled in two not-yet-started courses should be able to see both.
          // Any OTHER track, and program content, still bounce back, so a
          // pending registrant can't type their way into a started course.
          const reqTrack = pathname.match(/^\/dashboard\/track\/([^/]+)/)?.[1];
          const isOwnTrack = !!reqTrack && access.enrolled.some((t) => t.slug === reqTrack);
          const isDashboardHome = pathname === "/dashboard";
          if (!isOwnTrack && !isDashboardHome) {
            redirect(`/dashboard/track/${access.pendingSlug}`);
          }
        }
        // Confine onboarding-checklist learners (e.g. the Cybersecurity
        // acceptance checklist) to that checklist until every item is done — no
        // wandering into other dashboard pages via the back button. Survey +
        // settings pages are exempt above, so they can still complete items.
        if (!access.pendingOnly) {
          for (const t of access.enrolled) {
            if (!getEnforcedOnboardingChecklist(t.slug)) continue;
            const status = await getOnboardingStatus(supabase, ctx.userId, t.slug);
            if (status && !status.allComplete) {
              const reqTrack = pathname.match(/^\/dashboard\/track\/([^/]+)/)?.[1];
              if (reqTrack !== t.slug) redirect(`/dashboard/track/${t.slug}`);
              break;
            }
          }
        }
      }
    }
  }

  return (
    <ProgramProvider program={baseProgram}>
      {/* Set the collapsed-rail attribute before paint so the sidebar width
          doesn't flash on navigation. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('nav-collapsed')==='true')document.documentElement.dataset.navCollapsed='true'}catch(e){}`,
        }}
      />
      <ActivityBeacon />
      <div
        className="flex min-h-screen flex-col md:flex-row"
        style={
          {
            "--primary": skinAccent,
            "--accent": skinAccent,
          } as React.CSSProperties
        }
      >
        <Suspense fallback={isSurveyPage ? null : <NavSkeleton />}>
          <NavShell isSurveyPage={isSurveyPage} />
        </Suspense>
        <main
          id="dashboard-main"
          className={`flex-1 bg-paper ${isSurveyPage ? "" : "md:pl-60"}`}
          style={{ fontSize: "16px" }}
        >
          {!isSurveyPage && (
            <Suspense fallback={null}>
              <PreviewBanner />
            </Suspense>
          )}
          {!isSurveyPage && (
            <Suspense fallback={null}>
              <TopBarShell />
            </Suspense>
          )}
          {!isSurveyPage && (
            <Suspense fallback={null}>
              <BreadcrumbBar />
            </Suspense>
          )}
          {children}
          {!isSurveyPage && (
            // pb-20 on phones: the staff "Preview as student" pill floats
            // fixed bottom-right and sat directly on top of Privacy/Terms at
            // phone widths. Desktop has room; mobile gets a spacer.
            <footer className="border-t border-rule px-6 py-6 pb-20 text-xs text-ink-soft sm:pb-6">
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
                <p>© 2026 Beyond Code Collective</p>
                <nav className="flex items-center gap-4">
                  <a href="/privacy" className="hover:text-ink">
                    Privacy
                  </a>
                  <a href="/terms" className="hover:text-ink">
                    Terms
                  </a>
                </nav>
              </div>
            </footer>
          )}
        </main>
      </div>
      <Suspense fallback={null}>
        <Overlays isSurveyPage={isSurveyPage} />
      </Suspense>
    </ProgramProvider>
  );
}

// Every program a super-admin can switch into: the TS-config programs plus
// admin-created organizations (is_dynamic), which have no TS config and are
// otherwise reachable only by hand-editing the program-override cookie.
// Shared by the sidebar user menu and the top-bar account menu.
async function allSwitchablePrograms(): Promise<
  { slug: string; name: string; domain: string; dnsReady?: boolean }[]
> {
  const programs = getJoinablePrograms().map((p) => ({
    slug: p.slug,
    name: p.name,
    domain: p.domain,
    dnsReady: p.dnsReady,
  }));
  const { data: dynamicOrgs } = await createServiceClient()
    .from("programs")
    .select("slug, name")
    .eq("is_dynamic", true)
    .order("name", { ascending: true });
  const known = new Set(programs.map((p) => p.slug));
  for (const org of dynamicOrgs ?? []) {
    if (known.has(org.slug as string)) continue;
    programs.push({
      slug: org.slug as string,
      name: org.name as string,
      domain: "bccacademy.io",
      dnsReady: false,
    });
  }
  return programs;
}

async function NavShell({ isSurveyPage: isSurvey }: { isSurveyPage: boolean }) {
  const program = await resolveLearnerBrand(await getProgram());

  let isAdmin = false;
  let canSwitch = false;
  let firstName = "";
  let lastName = "";
  let email: string | null = null;
  let avatarUrl: string | null = null;
  let userRole = "";
  let staffFlag = false;
  let enrolledTrackSlugs: string[] = [];
  let canShowPreviewToggle = false;
  let previewingSlugs: string[] = [];
  let pendingLearner = false;
  // Programs reachable through a cross-program grant (empty for super-admins,
  // who already see every program, and for single-program staff).
  let grantSwitcherSlugs: string[] = [];
  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    const role = ctx.student?.role ?? "";
    userRole = role;
    const actualIsAdmin = canAccessAdminPanel(role);
    const previewSlugsRaw = await getPreviewTrackSlugs(role);
    const validPreviewSlugs = previewSlugsRaw.filter(
      (s) =>
        s === LUNCH_LEARN_PREVIEW_SLUG ||
        program.tracks.some((t) => t.slug === s),
    );
    const validPreviewSlug = validPreviewSlugs[0] ?? null;
    isAdmin = actualIsAdmin && !validPreviewSlug;
    canSwitch = canSwitchPrograms(role) && !validPreviewSlug;
    canShowPreviewToggle = canSwitchPrograms(role);
    if (actualIsAdmin && !canSwitchPrograms(role) && !validPreviewSlug) {
      // The person's HOME program is always in the list, not just whichever
      // program they happen to be looking at.
      //
      // This was [current, ...grants], de-duplicated against the program
      // registry — so someone whose only grant IS the program they're on saw a
      // one-entry list, `canSwitch` went false, the switcher vanished, and they
      // were stranded there with no way back to their home program short of
      // logging in again. Linda (home Catalyst, one grant: Beyond Code Centers)
      // hit exactly that the moment she opened Beyond Code Centers.
      const { data: me } = await createServiceClient()
        .from("students")
        .select("programs(slug)")
        .eq("id", ctx.userId)
        .maybeSingle();
      const homeProgram = (Array.isArray(me?.programs) ? me?.programs[0] : me?.programs) as
        | { slug: string }
        | undefined;
      grantSwitcherSlugs = [
        program.slug,
        ...(homeProgram?.slug ? [homeProgram.slug] : []),
        ...(await getGrantedProgramSlugs(ctx.userId)),
      ];
    }
    previewingSlugs = validPreviewSlugs;
    firstName = ctx.student?.first_name ?? "";
    lastName = ctx.student?.last_name ?? "";
    email = ctx.student?.email ?? ctx.userEmail;
    staffFlag = !!ctx.student?.is_staff;
    avatarUrl = ctx.student?.avatar_url ?? null;
    if (validPreviewSlug && validPreviewSlug !== LUNCH_LEARN_PREVIEW_SLUG) {
      enrolledTrackSlugs = validPreviewSlugs;
    }
    if (!isAdmin && !isSurvey && !validPreviewSlug) {
      const supabase = await createClient();
      const isStaff = isStaffResolved(ctx.student?.is_staff, email);
      const needsEnrollment = program.tracks.length > 0;

      const [intakeRes, enrolledRes, allowlistRes] = await Promise.all([
        !isStaff
          ? supabase
              .from("survey_responses")
              .select("completed_at")
              .eq("student_id", ctx.userId)
              .eq("survey_type", BCC_INTAKE_SURVEY_ID)
              .not("completed_at", "is", null)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        needsEnrollment
          ? getEnrolledTracks(supabase, ctx.userId, program)
          : Promise.resolve([]),
        // Always fetch allowlist entries so skipForPrograms works even when
        // a student's routing landed them on the wrong program dashboard.
        email
          ? createServiceClient()
              .from("allowed_signup_emails")
              .select("track_slug")
              .eq("email", email.toLowerCase())
          : Promise.resolve({ data: [] }),
      ]);

      // Self-heal: an enrolled learner in the MARKETING context (apex login
      // with no program cookies — e.g. a fresh bccacademy.io/login without a
      // join link) gets a trackless shell: empty sidebar, no log out, no
      // accessibility controls (2026-08-07). Route them through
      // switch-program, which repoints the program cookie at their course's
      // home program and returns them to a working dashboard.
      if (program.slug === "marketing") {
        const { data: anyEnrollment } = await createServiceClient()
          .from("student_tracks")
          .select("track_slug")
          .eq("student_id", ctx.userId)
          .limit(1)
          .maybeSingle();
        if (anyEnrollment?.track_slug) {
          redirect(
            `/dashboard/switch-program?track=${encodeURIComponent(anyEnrollment.track_slug)}`,
          );
        }
      }

      // Build the set of home programs from enrolled tracks + allowlist so
      // surveys with skipForPrograms: ['forte'] are suppressed for Forte
      // students regardless of which program dashboard they landed on.
      // getHomeProgramForTrack only knows TS-config courses. A builder-created
      // course resolved to nothing, which an allowlist reads as "not their
      // program" — so fall back to resolveHomeProgramSlug, which covers DB
      // courses too. Otherwise a Beyond Code Centers builder course would
      // quietly lose the survey its learners are supposed to get.
      const homePrograms = new Set<string>();
      const addHome = async (slug: string) => {
        const h = getHomeProgramForTrack(slug)?.slug ?? (await resolveHomeProgramSlug(slug));
        if (h) homePrograms.add(h);
      };
      await Promise.all([
        ...(enrolledRes as { slug: string }[]).map((t) => addHome(t.slug)),
        ...((allowlistRes as { data: { track_slug: string }[] | null }).data ?? []).map(
          (row) => addHome(row.track_slug),
        ),
      ]);

      const enrolledSlugs = (enrolledRes as { slug: string }[]).map((t) => t.slug);
      // The layout-body gate bounces pending registrants (every enrolled course
      // not yet started) off Tutor/Resources — so the nav must not advertise
      // those links, or clicking them silently redirects with no explanation.
      pendingLearner =
        !isStaff &&
        enrolledSlugs.length > 0 &&
        !(enrolledRes as TrackConfig[]).some((t) => trackHasStarted(t));
      // Skip check uses enrolled + allowlist tracks: a just-registered learner's
      // enrollment may not have completed yet (deferred setup runs on the
      // dashboard PAGE, after this layout gate), but their allowlist already
      // reflects the course they signed up for — so an event-course registrant
      // (e.g. game-on) is recognized and skips the cohort pre-survey on arrival.
      const allowlistSlugs = (
        (allowlistRes as { data: { track_slug: string }[] | null }).data ?? []
      ).map((r) => r.track_slug);
      // A companion (MASS) inherits its course's survey exemptions.
      const surveyTrackSlugs = collapseCompanionSlugs(
        [...enrolledSlugs, ...allowlistSlugs],
        program.tracks,
      );
      // Candidate surveys come from the learner's enrolled courses' HOME
      // programs, not just the browsing program — the apex resolves to
      // `marketing` (no surveys), which made every course-registered survey
      // invisible here and let the generic intake win (2026-08-07).
      const { getProgramBySlug: programBySlugForSurveys } = await import("@/lib/programs");
      const candidateSurveys = [
        ...(program.surveys ?? []),
        ...[...homePrograms].flatMap((s) => programBySlugForSurveys(s).surveys ?? []),
      ].filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
      const requiredSurvey = !isStaff
        ? candidateSurveys.find(
            (s) =>
              s.required &&
              surveyAppliesToPrograms(s.appliesToPrograms, homePrograms) &&
              surveyAppliesToTracks(s.appliesToTracks, surveyTrackSlugs) &&
              !s.skipForPrograms?.some((p) => homePrograms.has(p)) &&
              !surveySkippedForTracks(s.skipForTracks, surveyTrackSlugs),
          )
        : undefined;

      // Intake survey is OPT-IN — only when toggled on for this program or one
      // of the learner's enrolled tracks (admin Features page). Off by default.
      const surveyEnabled =
        !isStaff &&
        (await isSurveyEnabledForLearner(
          program.slug,
          (enrolledRes as { slug: string }[]).map((t) => t.slug),
        ));

      // Required cohort surveys are OPT-IN too — only fire when the program/track
      // has survey_enabled toggled on (admin Tools/Features page). A course's
      // own survey outranks the generic intake, and a learner with ANY
      // applicable course survey never sees the intake at all.
      if (requiredSurvey && surveyEnabled) {
        const { data: surveyDone } = await supabase
          .from("survey_responses")
          .select("completed_at")
          .eq("student_id", ctx.userId)
          .eq("survey_type", requiredSurvey.id)
          .not("completed_at", "is", null)
          .maybeSingle();
        if (!surveyDone) redirect(`/dashboard/survey/${requiredSurvey.id}`);
      }
      if (surveyEnabled && !requiredSurvey && !intakeRes.data) {
        redirect(`/dashboard/survey/${BCC_INTAKE_SURVEY_ID}`);
      }
      if (needsEnrollment) {
        enrolledTrackSlugs = enrolledRes.map((t) => t.slug);
      }
    }
  } else {
    // Demo fallback trusts a plaintext-email cookie — never allow it in prod,
    // even if Supabase env somehow went missing on a production deploy.
    if (process.env.NODE_ENV === "production") redirect("/");
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    if (!demoEmail) redirect("/");
    const user = getDemoUser(demoEmail);
    const role = user?.role ?? "";
    userRole = role;
    isAdmin = canAccessAdminPanel(role);
    canSwitch = canSwitchPrograms(role);
    firstName = user?.first_name ?? "";
    lastName = user?.last_name ?? "";
    email = user?.email ?? demoEmail;
  }

  const showTutor = isTutorAvailable(program) && !pendingLearner;
  // Resources nav appears only when the current program actually has resources
  // First previewed slug — single-course consumers below key off it.
  const previewingSlug = previewingSlugs[0] ?? null;
  // (data-driven — no empty nav item). Independent of the AI Tutor.
  const showResources =
    !pendingLearner &&
    (await programHasResources(program.slug, enrolledTrackSlugs, isAdmin));
  // canAccessStaff gates the Workshops nav. Demote it in preview mode the
  // same way isAdmin / canSwitch are — otherwise a super-admin previewing
  // as an AI Literacy student still sees the Workshops link and the nav
  // doesn't fully match what a real student would experience.
  const canAccessStaff =
    canAccessStaffContent(userRole, email, staffFlag) && !previewingSlug;
  let programs: { slug: string; name: string; domain: string; dnsReady?: boolean }[] = [];
  // Cross-program staff (grants, not super_admin) get the switcher too, but it
  // lists ONLY the programs they were granted — that's the whole point of
  // grants: work in two programs without holding all of them.
  if (!canSwitch && grantSwitcherSlugs.length > 0) {
    programs = getJoinablePrograms()
      .filter((p) => grantSwitcherSlugs.includes(p.slug))
      .map((p) => ({ slug: p.slug, name: p.name, domain: p.domain, dnsReady: p.dnsReady }));
    canSwitch = programs.length > 1;
  }
  if (canSwitch && programs.length === 0) {
    // Super-admins manage every program, so the switcher lists them all —
    // Catalyst, Upskill Bahamas (Forte), Beyond Code Centers, BGC. getAllPrograms
    // returns only Catalyst (Forte/BCC/BGC live in SPECIAL_CONFIGS), which left
    // super-admins with no way to switch into Upskill Bahamas et al.
    // Builder-created courses are tracks inside Catalyst, not separate programs —
    // manage those via /admin/courses, not the switcher.
    programs = await allSwitchablePrograms();
  }

  // Only redirect staff with no tracks to Lunch & Learns when they're on
  // the Catalyst umbrella (no specific program context). Staff who are also
  // enrolled learners in a specific program (forte, forge, etc.) should land
  // on their program dashboard, not the L&L hub.
  const isUmbrellaContext = program.slug === "catalyst" || program.slug === "bcc-academy";
  const showLunchLearnSidebar =
    previewingSlug === LUNCH_LEARN_PREVIEW_SLUG ||
    (!isAdmin && enrolledTrackSlugs.length === 0 && !!email && isStaffResolved(staffFlag, email) && isUmbrellaContext);

  // A student with no enrolled tracks yet (brand-new, enrollment still being
  // finalized on this same request) used to get the "topbar" variant — a
  // horizontal header that the flex-row + md:pl-60 shell squishes into a broken
  // vertically-centered left column. Give them the standard fixed sidebar
  // instead (just Home/Help until their course nav populates), which fits the
  // layout and matches what they'll see once enrolled.
  const navVariant: "admin-sidebar" | "student-sidebar" | "lunch-learn-sidebar" | "topbar" = isAdmin
    ? "admin-sidebar"
    : showLunchLearnSidebar
      ? "lunch-learn-sidebar"
      : "student-sidebar";

  let lunchLearnRecordings: { id: string; title: string; recorded_at: string }[] = [];
  if (navVariant === "lunch-learn-sidebar" && isSupabaseConfigured()) {
    const svc = createServiceClient();
    const { data } = await svc
      .from("lunch_learns")
      .select("id, title, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(30);
    lunchLearnRecordings = data ?? [];
  }

  // Hidden (retired) courses are filtered out of BOTH the learner sidebar and
  // the admin course switcher, so this resolves for everyone — it used to be
  // fetched admin-only, further down.
  const hiddenSlugs = await getHiddenTrackSlugs();

  // In admin preview mode pass all tracks so the sidebar can show correct
  // weeks for any track page the admin navigates to (filtered by URL in Nav).
  const sidebarTrackSource =
    navVariant === "student-sidebar" && previewingSlug && canShowPreviewToggle
      ? program.tracks
      : program.tracks.filter(
          // Retired (hidden) courses drop out of the learner sidebar too — the
          // Hide control is meant to take a course off the platform, not just
          // off the admin's view of it.
          (t) => enrolledTrackSlugs.includes(t.slug) && !hiddenSlugs.has(t.slug),
        );

  // Real per-week titles, resolved session_content.title → WeekConfig.title,
  // so the sidebar shows "AI Fundamentals & Prompt Engineering" rather than a
  // generic "Week 1". getDashboardIndex is React-cached, so this shares the
  // execution the breadcrumbs/search shells already trigger — no extra query.
  const weekTitles =
    navVariant === "student-sidebar"
      ? (await getDashboardIndex()).labels
      : {};

  // Which sessions have ACTUALLY happened, and which this learner has finished.
  //
  // The sidebar derived both from `startDate + 7 days × week`, which is wrong on
  // any course meeting more than once a week: Security+ held Session 3 on Jul 21
  // and Session 4 on Jul 23, while that arithmetic placed them in August and the
  // sidebar showed them as upcoming.
  //
  // "Held" comes from check-ins or an existing recording — both are evidence a
  // class ran, which a schedule cannot provide. "Completed" is the learner's own
  // week_progress, which is what a tick should mean.
  const heldWeeks: Record<string, number[]> = {};
  const completedWeeks: Record<string, number[]> = {};
  // getSessionContext is React-cached, so this shares the call the shells above
  // already made rather than adding a round-trip.
  const sidebarUserId =
    navVariant === "student-sidebar" && isSupabaseConfigured()
      ? (await getSessionContext())?.userId
      : null;
  if (sidebarUserId) {
    const slugs = sidebarTrackSource.map((t) => t.slug);
    if (slugs.length > 0) {
      const svcSide = createServiceClient();
      const [attRes, recRes, progRes] = await Promise.all([
        svcSide.from("attendance").select("track, week_number").in("track", slugs).not("checked_in_at", "is", null),
        svcSide.from("session_content").select("track, week_number, recording_url").in("track", slugs),
        svcSide.from("week_progress").select("track_slug, week_number, video_watched_at").eq("user_id", sidebarUserId).in("track_slug", slugs),
      ]);
      const add = (map: Record<string, number[]>, key: string, week: number) => {
        const list = (map[key] ??= []);
        if (!list.includes(week)) list.push(week);
      };
      for (const a of (attRes.data ?? []) as { track: string; week_number: number }[]) {
        add(heldWeeks, a.track, a.week_number);
      }
      for (const r of (recRes.data ?? []) as { track: string; week_number: number; recording_url: string | null }[]) {
        if (r.recording_url) add(heldWeeks, r.track, r.week_number);
      }
      for (const w of (progRes.data ?? []) as { track_slug: string; week_number: number; video_watched_at: string | null }[]) {
        if (w.video_watched_at) add(completedWeeks, w.track_slug, w.week_number);
      }
    }
  }

  const curriculumTracks =
    navVariant === "student-sidebar"
      ? sidebarTrackSource
          .map((t) => ({
            slug: t.slug,
            shortName: t.shortName,
            startDate: t.startDate,
            startDateTbd: t.startDateTbd,
            selfPaced: t.selfPaced,
            totalWeeks: t.totalWeeks,
            lastSessionDayOffset: t.lastSessionDayOffset,
            unitLabel: t.unitLabel,
            companionOf: t.companionOf,
            heldWeeks: heldWeeks[t.slug] ?? [],
            completedWeeks: completedWeeks[t.slug] ?? [],
            weekSummaries: t.weekSummaries.map((ws) => ({
              week: ws.week,
              topic: ws.topic,
              icon: ws.icon,
              label: ws.label,
              title: weekTitles[`/dashboard/track/${t.slug}/${ws.week}`],
            })),
          }))
      : [];

  // Sidebar course switcher honors the Manage Courses Hide/Show control, the
  // same way the admin home does — a hidden course must not linger here as a
  // stale entry (it still navigates to an empty tab).
  const adminTracks = isAdmin
    ? program.tracks
        .filter((t) => !hiddenSlugs.has(t.slug))
        .map((t) => ({ slug: t.slug, shortName: t.shortName }))
    : [];

  return (
    <>
      <Nav
        isAdmin={isAdmin}
        canAccessStaff={canAccessStaff}
        logo={program.logoLight ?? program.logo}
        programName={program.name}
        showTutor={showTutor}
        showResources={showResources}
        minimal={isSurvey}
        firstName={firstName}
        lastName={lastName}
        email={email}
        avatarUrl={avatarUrl}
        canSwitch={canSwitch}
        programs={programs}
        currentProgramSlug={program.slug}
        variant={navVariant}
        // Home follows the previewed course. The Lunch & Learns sentinel maps
        // to null so Home falls back to /dashboard (the L&L hub) — and so does
        // a MULTI-course preview, whose home is the course-picker page, not
        // any single course.
        previewingSlug={
          previewingSlug === LUNCH_LEARN_PREVIEW_SLUG || previewingSlugs.length > 1
            ? null
            : previewingSlug
        }
        curriculumTracks={curriculumTracks}
        adminTracks={adminTracks}
        lunchLearnRecordings={lunchLearnRecordings}
        showLunchLearnLink={isStaffResolved(staffFlag, email) && program.slug === "bgc"}
      />
    </>
  );
}

// Light-shell top bar (Meridian-style). Rendered inside <main> so it sticks
// above page content. Only for learner surfaces — admins keep the dark
// Breadcrumb trail, rendered on all viewports above page content. Resolves
// dynamic route segments to real names via the shared dashboard index. The
// trail itself is computed client-side (usePathname) so it stays correct across
// client navigations even though this server wrapper renders once.
async function BreadcrumbBar() {
  if (!isSupabaseConfigured()) return null;
  const { labels } = await getDashboardIndex();
  // Preview-aware: a super-admin previewing as a student is NOT treated as admin,
  // so the "Home" crumb points at the student dashboard, not the admin hub.
  const ctx = await getSessionContext();
  const role = ctx?.student?.role ?? "";
  const isAdmin = canAccessAdminPanel(role) && !(await getPreviewTrackSlug(role));
  return <Breadcrumbs labels={labels} isAdmin={isAdmin} />;
}

// sidebar with its in-nav account menu, so we render nothing for them.
async function TopBarShell() {
  const program = await getProgram();
  if (!isSupabaseConfigured()) return null;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const role = ctx.student?.role ?? "";
  const previewSlug = await getPreviewTrackSlug(role);
  const isPreviewing = !!previewSlug;
  // Admins now share the light shell, so they get the top bar too — it carries
  // their account menu (the dark in-sidebar UserMenu is gone on the light shell).

  const canSwitch = canSwitchPrograms(role) && !isPreviewing;
  // Super-admins manage every program — list them all (Catalyst, Upskill
  // Bahamas, Beyond Code Centers, BGC), not just Catalyst from getAllPrograms.
  const programs = canSwitch ? await allSwitchablePrograms() : [];

  // ⌘K search index (courses, lessons, workshops, recordings) — shared,
  // request-cached source also used by the breadcrumb trail.
  const { searchItems } = await getDashboardIndex();

  // Pending registrants are confined to their holding page (see the layout-body
  // gate). Mirror that in search so it doesn't surface program pages they can't
  // reach — clicking would just bounce them, so don't show them at all.
  let confined = false;
  const isLearner =
    !canAccessAdminPanel(role) && !isStaffResolved(ctx.student?.is_staff, ctx.student?.email ?? ctx.userEmail);
  if (isLearner) {
    const supabase = await createClient();
    confined = (await getLearnerAccess(supabase, ctx.userId, program)).pendingOnly;
  }

  // Camp learners (BGC) live in exactly one course — global search only
  // surfaces places they can't go, so drop it for them entirely. The
  // standalone agreement page is a focused sign-here surface (often reached
  // by a shared link) — search is noise there for everyone.
  const topBarPathname = (await headers()).get("x-pathname") ?? "";
  const hideSearch =
    (isLearner && program.slug === "bgc") ||
    topBarPathname.startsWith("/dashboard/agreement");

  return (
    <DashboardTopBar
      firstName={ctx.student?.first_name ?? ""}
      lastName={ctx.student?.last_name ?? ""}
      email={ctx.student?.email ?? ctx.userEmail}
      avatarUrl={ctx.student?.avatar_url ?? null}
      canSwitch={canSwitch}
      programs={programs}
      currentProgramSlug={program.slug}
      searchItems={
        confined
          ? []
          : // Workshop lessons are BGC-internal content — outside BGC their
            // pages 404, so they must not surface as search results either.
            program.slug === "bgc"
            ? searchItems
            : searchItems.filter((i) => !i.href.startsWith("/dashboard/workshops"))
      }
      confined={confined}
      hideSearch={hideSearch}
      tutorAvailable={isTutorAvailable(program)}
      workshopsAvailable={program.slug === "bgc"}
    />
  );
}

async function Overlays({ isSurveyPage }: { isSurveyPage: boolean }) {
  if (isSurveyPage) return null;

  const program = await getProgram();
  const showTutor = isTutorAvailable(program);

  if (!isSupabaseConfigured()) {
    return showTutor ? <TutorFab /> : null;
  }

  const ctx = await getSessionContext();
  if (!ctx) return null;

  const role = ctx.student?.role ?? "";

  // The tutor is one of the surfaces pending registrants are confined away
  // from (layout-body gate) — don't float a button that only bounces them.
  let confined = false;
  if (!canAccessAdminPanel(role) && !isStaffResolved(ctx.student?.is_staff, ctx.student?.email ?? ctx.userEmail)) {
    const supabase = await createClient();
    confined = (await getLearnerAccess(supabase, ctx.userId, program)).pendingOnly;
  }

  // Learner accounts created from an email alone (bulk invites, Eventbrite
  // claims) have no name — but the certificate and the Zoom join both print
  // it. Block once, ask once: the overlay never renders again after save.
  const needsName =
    !!ctx.student &&
    !canAccessAdminPanel(role) &&
    !isStaffResolved(ctx.student.is_staff, ctx.student.email ?? ctx.userEmail) &&
    !(ctx.student.first_name ?? "").trim() &&
    !(ctx.student.last_name ?? "").trim();

  // One-time ZIP + birthday capture for grant reporting. Learners only, never
  // staff, and never the Forte Bahamas program (a US ZIP doesn't apply there).
  // Only checked once a learner HAS a name, so it never stacks with the name
  // overlay. The session context doesn't carry these columns, so read them here
  // only when the cheaper conditions already hold.
  const profileEligible =
    !!ctx.student &&
    !canAccessAdminPanel(role) &&
    !isStaffResolved(ctx.student.is_staff, ctx.student.email ?? ctx.userEmail) &&
    !needsName &&
    program.slug !== "forte";
  let needsZip = false;
  let needsDob = false;
  if (profileEligible) {
    const { data: prof } = await createServiceClient()
      .from("students")
      .select("zip, date_of_birth")
      .eq("id", ctx.userId)
      .maybeSingle<{ zip: string | null; date_of_birth: string | null }>();
    needsZip = !((prof?.zip ?? "").trim());
    needsDob = !prof?.date_of_birth;
  }
  const needsProfile = needsZip || needsDob;

  // Validate against ALL programs' tracks (the menu lists every program), not
  // just the current one — the L&L sentinel passes through as-is.
  const previewSlugsAll = await getPreviewTrackSlugs(role);

  // Preview menu: every course across all programs, grouped under its home
  // program (mirrors the Courses catalog, which already aggregates all
  // programs). Dedup by slug — some programs aggregate others' tracks (e.g.
  // Catalyst lists Forte's tracks), but each course should appear once, under
  // its owning program.
  // Apply DB track_overrides per program — track names (and program names) are
  // edited live in track_overrides, which is the source of truth. The raw TS
  // config would show stale names (e.g. "AI Literacy" instead of the renamed
  // "Foundations of AI & Digital Skills").
  // Hidden courses (admin Hide/Show) stay out of the preview menu too — the
  // admin home and catalog already filter by hidden_courses, but this menu
  // didn't, so retired courses kept piling up here (2026-07-13).
  const [hiddenTrackSlugs, overriddenPrograms, dynamicOrgPrograms] = await Promise.all([
    getHiddenTrackSlugs(),
    Promise.all(getJoinablePrograms().map((p) => getProgramWithOverrides(p.slug))),
    // Admin-created orgs (is_dynamic) have no TS config — resolve them so
    // their courses appear in the preview menu too.
    listDynamicPrograms().then((orgs) =>
      Promise.all(orgs.map((o) => fetchDynamicProgram(o.slug))),
    ),
  ]);
  overriddenPrograms.push(
    ...dynamicOrgPrograms.filter((p): p is NonNullable<typeof p> => p !== null),
  );

  // Validate the preview cookie against the full menu (config programs +
  // dynamic orgs + the current program) so a dynamic-org course sticks.
  const validPreviewSlugs = previewSlugsAll.filter(
    (s) =>
      s === LUNCH_LEARN_PREVIEW_SLUG ||
      overriddenPrograms.some((p) => p.tracks.some((t) => t.slug === s)) ||
      program.tracks.some((t) => t.slug === s),
  );
  const programBySlug = new Map(overriddenPrograms.map((p) => [p.slug, p] as const));

  // Instructors may preview only the courses they teach; super-admins/admins
  // see the full menu. `instructorScope` is null for the latter (no filter).
  const instructorScope = canSwitchPrograms(role)
    ? null
    : new Set(await getMyInstructorTracks());

  const previewGroupMap = new Map<
    string,
    { programSlug: string; programName: string; tracks: { slug: string; name: string }[] }
  >();
  const seenTrackSlugs = new Set<string>();
  for (const p of overriddenPrograms) {
    for (const t of p.tracks) {
      if (hiddenTrackSlugs.has(t.slug)) continue;
      if (seenTrackSlugs.has(t.slug)) continue;
      if (instructorScope && !instructorScope.has(t.slug)) continue;
      seenTrackSlugs.add(t.slug);
      const home = getHomeProgramForTrack(t.slug);
      const homeSlug = home?.slug ?? p.slug;
      // Read the name + program label from the track's HOME program's
      // override-applied config — Catalyst aggregates other programs' tracks
      // but without their overrides, so the home program is authoritative.
      const homeProgram = programBySlug.get(homeSlug);
      const name = homeProgram?.tracks.find((x) => x.slug === t.slug)?.name ?? t.name;
      const homeName = homeProgram?.name ?? home?.name ?? p.name;
      const group =
        previewGroupMap.get(homeSlug) ??
        { programSlug: homeSlug, programName: homeName, tracks: [] };
      group.tracks.push({ slug: t.slug, name });
      previewGroupMap.set(homeSlug, group);
    }
  }
  const previewGroups = [
    // Lunch & Learns is a super-admin-only preview convenience, not something
    // an instructor is scoped to teach — omit it for them.
    ...(instructorScope
      ? []
      : [
          {
            programSlug: "",
            programName: "",
            tracks: [{ slug: LUNCH_LEARN_PREVIEW_SLUG, name: "Lunch & Learns" }],
          },
        ]),
    ...Array.from(previewGroupMap.values()),
  ];

  // Super-admins always get the pill; instructors/admins only when they have at
  // least one previewable course. Placed after previewGroupMap is built.
  const canShowPreview =
    canSwitchPrograms(role) ||
    (canAccessAdminPanel(role) && previewGroupMap.size > 0);

  return (
    <>
      {needsName && <NameCaptureOverlay campMode={program.slug === "bgc"} />}
      {!needsName && needsProfile && (
        <ProfileCaptureOverlay needsZip={needsZip} needsDob={needsDob} />
      )}
      {showTutor && !confined && <TutorFab />}
      {canShowPreview && (
        <PreviewToggle previewingSlugs={validPreviewSlugs} groups={previewGroups} />
      )}
    </>
  );
}
