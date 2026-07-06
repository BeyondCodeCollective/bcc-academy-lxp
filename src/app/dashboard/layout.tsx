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
import { PreviewToggle } from "@/components/preview-toggle";
import { getProgram, getProgramWithOverrides } from "@/lib/programs/server";
import { getProgramBySlug, getAllPrograms, getJoinablePrograms, isTutorAvailable } from "@/lib/programs";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms, canAccessStaffContent } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getEnrolledTracks } from "@/lib/enrollment";
import { getLearnerAccess } from "@/lib/auth/active-enrollment";
import { getOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
import { BCC_INTAKE_SURVEY_ID, surveySkippedForTracks } from "@/lib/surveys/platform";
import { isSurveyEnabledForLearner } from "@/lib/surveys/features";
import { isStaffEmail } from "@/lib/auth/admins";
import { getHomeProgramForTrack } from "@/lib/programs";
import { programHasResources } from "@/lib/resources";
import { MARKETING_SLUG } from "@/lib/programs/marketing";
import type { ProgramConfig } from "@/lib/programs/types";

function NavSkeleton() {
  // Light placeholder that matches the shell — avoids a black flash on
  // refresh while the nav streams in.
  return (
    <nav className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 shell-light animate-pulse">
      <div className="flex items-center gap-3 px-6 h-16">
        <div className="h-4 w-28 rounded bg-rule" />
      </div>
      <div className="flex-1 space-y-1.5 p-4">
        <div className="h-11 rounded-lg bg-rule" />
        <div className="h-11 rounded-lg bg-rule" />
        <div className="h-11 rounded-lg bg-rule" />
      </div>
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
    let homeSlug = getHomeProgramForTrack(slug)?.slug ?? null;
    if (!homeSlug) {
      // DB-driven (Course Builder) track — not in TS config; look up its program.
      const { data: ov } = await svc
        .from("track_overrides")
        .select("programs(slug)")
        .eq("track_slug", slug)
        .maybeSingle();
      homeSlug = (ov?.programs as unknown as { slug: string } | null)?.slug ?? null;
    }
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
        isStaffEmail(ctx.student?.email ?? ctx.userEmail);
      if (!exempt) {
        const supabase = await createClient();
        const access = await getLearnerAccess(supabase, ctx.userId, activeProgram);
        if (access.pendingOnly && access.pendingSlug) {
          // Only their OWN pending track's holding page is allowed. Program pages
          // AND any other track bounce back to it — so a pending registrant can't
          // type their way into a started course or program content either.
          const reqTrack = pathname.match(/^\/dashboard\/track\/([^/]+)/)?.[1];
          const isOwnTrack = !!reqTrack && access.enrolled.some((t) => t.slug === reqTrack);
          if (!isOwnTrack) {
            redirect(`/dashboard/track/${access.pendingSlug}`);
          }
        }
        // Confine onboarding-checklist learners (e.g. the Cybersecurity
        // acceptance checklist) to that checklist until every item is done — no
        // wandering into other dashboard pages via the back button. Survey +
        // settings pages are exempt above, so they can still complete items.
        if (!access.pendingOnly) {
          for (const t of access.enrolled) {
            if (!getOnboardingChecklist(t.slug)) continue;
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
            <footer className="border-t border-rule px-6 py-6 text-xs text-ink-soft">
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

async function NavShell({ isSurveyPage: isSurvey }: { isSurveyPage: boolean }) {
  const program = await resolveLearnerBrand(await getProgram());

  let isAdmin = false;
  let canSwitch = false;
  let firstName = "";
  let lastName = "";
  let email: string | null = null;
  let avatarUrl: string | null = null;
  let userRole = "";
  let enrolledTrackSlugs: string[] = [];
  let canShowPreviewToggle = false;
  let previewingSlug: string | null = null;
  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    const role = ctx.student?.role ?? "";
    userRole = role;
    const actualIsAdmin = canAccessAdminPanel(role);
    const previewSlug = await getPreviewTrackSlug(role);
    const validPreviewSlug =
      previewSlug &&
      (previewSlug === LUNCH_LEARN_PREVIEW_SLUG ||
        program.tracks.some((t) => t.slug === previewSlug))
        ? previewSlug
        : null;
    isAdmin = actualIsAdmin && !validPreviewSlug;
    canSwitch = canSwitchPrograms(role) && !validPreviewSlug;
    canShowPreviewToggle = canSwitchPrograms(role);
    previewingSlug = validPreviewSlug;
    firstName = ctx.student?.first_name ?? "";
    lastName = ctx.student?.last_name ?? "";
    email = ctx.student?.email ?? ctx.userEmail;
    avatarUrl = ctx.student?.avatar_url ?? null;
    if (validPreviewSlug && validPreviewSlug !== LUNCH_LEARN_PREVIEW_SLUG) {
      enrolledTrackSlugs = [validPreviewSlug];
    }
    if (!isAdmin && !isSurvey && !validPreviewSlug) {
      const supabase = await createClient();
      const isStaff = isStaffEmail(email);
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

      // Build the set of home programs from enrolled tracks + allowlist so
      // surveys with skipForPrograms: ['forte'] are suppressed for Forte
      // students regardless of which program dashboard they landed on.
      const homePrograms = new Set<string>();
      for (const t of enrolledRes as { slug: string }[]) {
        const h = getHomeProgramForTrack(t.slug)?.slug;
        if (h) homePrograms.add(h);
      }
      for (const row of (allowlistRes as { data: { track_slug: string }[] | null }).data ?? []) {
        const h = getHomeProgramForTrack(row.track_slug)?.slug;
        if (h) homePrograms.add(h);
      }

      const enrolledSlugs = (enrolledRes as { slug: string }[]).map((t) => t.slug);
      // Skip check uses enrolled + allowlist tracks: a just-registered learner's
      // enrollment may not have completed yet (deferred setup runs on the
      // dashboard PAGE, after this layout gate), but their allowlist already
      // reflects the course they signed up for — so an event-course registrant
      // (e.g. game-on) is recognized and skips the cohort pre-survey on arrival.
      const allowlistSlugs = (
        (allowlistRes as { data: { track_slug: string }[] | null }).data ?? []
      ).map((r) => r.track_slug);
      const surveyTrackSlugs = [...enrolledSlugs, ...allowlistSlugs];
      const requiredSurvey = !isStaff
        ? program.surveys?.find(
            (s) =>
              s.required &&
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

      if (surveyEnabled && !intakeRes.data) {
        redirect(`/dashboard/survey/${BCC_INTAKE_SURVEY_ID}`);
      }
      // Required cohort surveys are OPT-IN too — only fire when the program/track
      // has survey_enabled toggled on (admin Tools/Features page). Off by default;
      // no more hardcoded auto-survey for new users.
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

  const showTutor = isTutorAvailable(program);
  // Resources nav appears only when the current program actually has resources
  // (data-driven — no empty nav item). Independent of the AI Tutor.
  const showResources = await programHasResources(program.slug);
  // canAccessStaff gates the Workshops nav. Demote it in preview mode the
  // same way isAdmin / canSwitch are — otherwise a super-admin previewing
  // as an AI Literacy student still sees the Workshops link and the nav
  // doesn't fully match what a real student would experience.
  const canAccessStaff =
    canAccessStaffContent(userRole, email) && !previewingSlug;
  let programs: { slug: string; name: string; domain: string; dnsReady?: boolean }[] = [];
  if (canSwitch) {
    // Super-admins manage every program, so the switcher lists them all —
    // Catalyst, Upskill Bahamas (Forte), Beyond Code Centers, BGC. getAllPrograms
    // returns only Catalyst (Forte/BCC/BGC live in SPECIAL_CONFIGS), which left
    // super-admins with no way to switch into Upskill Bahamas et al.
    // Builder-created courses are tracks inside Catalyst, not separate programs —
    // manage those via /admin/courses, not the switcher.
    programs = getJoinablePrograms().map((p) => ({
      slug: p.slug,
      name: p.name,
      domain: p.domain,
      dnsReady: p.dnsReady,
    }));
  }

  // Only redirect staff with no tracks to Lunch & Learns when they're on
  // the Catalyst umbrella (no specific program context). Staff who are also
  // enrolled learners in a specific program (forte, forge, etc.) should land
  // on their program dashboard, not the L&L hub.
  const isUmbrellaContext = program.slug === "catalyst" || program.slug === "bcc-academy";
  const showLunchLearnSidebar =
    previewingSlug === LUNCH_LEARN_PREVIEW_SLUG ||
    (!isAdmin && enrolledTrackSlugs.length === 0 && !!email && isStaffEmail(email) && isUmbrellaContext);

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

  // In admin preview mode pass all tracks so the sidebar can show correct
  // weeks for any track page the admin navigates to (filtered by URL in Nav).
  const sidebarTrackSource =
    navVariant === "student-sidebar" && previewingSlug && canShowPreviewToggle
      ? program.tracks
      : program.tracks.filter((t) => enrolledTrackSlugs.includes(t.slug));

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
            weekSummaries: t.weekSummaries.map((ws) => ({
              week: ws.week,
              topic: ws.topic,
              icon: ws.icon,
            })),
          }))
      : [];

  const adminTracks = isAdmin
    ? program.tracks.map((t) => ({ slug: t.slug, shortName: t.shortName }))
    : [];

  return (
    <>
      <Nav
        isAdmin={isAdmin}
        canAccessStaff={canAccessStaff}
        logo={program.logo}
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
        curriculumTracks={curriculumTracks}
        adminTracks={adminTracks}
        lunchLearnRecordings={lunchLearnRecordings}
        showLunchLearnLink={isStaffEmail(email) && program.slug === "bgc"}
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
  const programs = canSwitch
    ? getJoinablePrograms().map((p) => ({
        slug: p.slug,
        name: p.name,
        domain: p.domain,
        dnsReady: p.dnsReady,
      }))
    : [];

  // ⌘K search index (courses, lessons, workshops, recordings) — shared,
  // request-cached source also used by the breadcrumb trail.
  const { searchItems } = await getDashboardIndex();

  // Pending registrants are confined to their holding page (see the layout-body
  // gate). Mirror that in search so it doesn't surface program pages they can't
  // reach — clicking would just bounce them, so don't show them at all.
  let confined = false;
  const isLearner =
    !canAccessAdminPanel(role) && !isStaffEmail(ctx.student?.email ?? ctx.userEmail);
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

  // Learner accounts created from an email alone (bulk invites, Eventbrite
  // claims) have no name — but the certificate and the Zoom join both print
  // it. Block once, ask once: the overlay never renders again after save.
  const needsName =
    !!ctx.student &&
    !canAccessAdminPanel(role) &&
    !isStaffEmail(ctx.student.email ?? ctx.userEmail) &&
    !(ctx.student.first_name ?? "").trim() &&
    !(ctx.student.last_name ?? "").trim();

  const canShowPreview = canSwitchPrograms(role);
  const previewSlug = await getPreviewTrackSlug(role);
  const validPreviewSlug =
    previewSlug &&
    (previewSlug === LUNCH_LEARN_PREVIEW_SLUG ||
      program.tracks.some((t) => t.slug === previewSlug))
      ? previewSlug
      : null;

  // Preview menu: every course across all programs, grouped under its home
  // program (mirrors the Courses catalog, which already aggregates all
  // programs). Dedup by slug — some programs aggregate others' tracks (e.g.
  // Catalyst lists Forte's tracks), but each course should appear once, under
  // its owning program.
  // Apply DB track_overrides per program — track names (and program names) are
  // edited live in track_overrides, which is the source of truth. The raw TS
  // config would show stale names (e.g. "AI Literacy" instead of the renamed
  // "Foundations of AI & Digital Skills").
  const overriddenPrograms = await Promise.all(
    getJoinablePrograms().map((p) => getProgramWithOverrides(p.slug)),
  );
  const programBySlug = new Map(overriddenPrograms.map((p) => [p.slug, p] as const));

  const previewGroupMap = new Map<
    string,
    { programSlug: string; programName: string; tracks: { slug: string; name: string }[] }
  >();
  const seenTrackSlugs = new Set<string>();
  for (const p of overriddenPrograms) {
    for (const t of p.tracks) {
      if (seenTrackSlugs.has(t.slug)) continue;
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
    {
      programSlug: "",
      programName: "",
      tracks: [{ slug: LUNCH_LEARN_PREVIEW_SLUG, name: "Lunch & Learns" }],
    },
    ...Array.from(previewGroupMap.values()),
  ];

  return (
    <>
      {needsName && <NameCaptureOverlay campMode={program.slug === "bgc"} />}
      {showTutor && <TutorFab />}
      {canShowPreview && (
        <PreviewToggle previewingSlug={validPreviewSlug} groups={previewGroups} />
      )}
    </>
  );
}
