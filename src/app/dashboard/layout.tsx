import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured, createClient, createServiceClient } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { DashboardTopBar } from "@/components/dashboard-topbar";
import { TutorFab } from "@/components/tutor-fab";
import { PreviewToggle } from "@/components/preview-toggle";
import { getProgram } from "@/lib/programs/server";
import { getProgramBySlug, getAllPrograms, getJoinablePrograms, isTutorAvailable } from "@/lib/programs";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms, canAccessStaffContent } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getEnrolledTracks } from "@/lib/enrollment";
import { BCC_INTAKE_SURVEY_ID } from "@/lib/surveys/platform";
import { isSurveyEnabledForLearner } from "@/lib/surveys/features";
import { isStaffEmail } from "@/lib/auth/admins";
import { getHomeProgramForTrack } from "@/lib/programs";

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isSurveyPage = pathname.startsWith("/dashboard/survey");
  const programSlug = headersList.get("x-program-slug") ?? "bcc-academy";
  const baseProgram = getProgramBySlug(programSlug);

  // Skin accent follows the program the learner is actually in (the same
  // resolver the nav uses — header-based getProgramBySlug can lag behind and
  // return Catalyst for a Forte student). A per-track override lets a track
  // surfaced inside another program still wear its own home program's accent.
  const activeProgram = await getProgram();
  const trackSlug = pathname.match(/^\/dashboard\/track\/([^/]+)/)?.[1];
  const skinAccent =
    (trackSlug ? getHomeProgramForTrack(trackSlug) : null)?.colors.accent ??
    activeProgram.colors.accent;

  return (
    <ProgramProvider program={baseProgram}>
      {/* Set the collapsed-rail attribute before paint so the sidebar width
          doesn't flash on navigation. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('nav-collapsed')==='true')document.documentElement.dataset.navCollapsed='true'}catch(e){}`,
        }}
      />
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
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <Overlays isSurveyPage={isSurveyPage} />
      </Suspense>
    </ProgramProvider>
  );
}

async function NavShell({ isSurveyPage: isSurvey }: { isSurveyPage: boolean }) {
  const program = await getProgram();

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

      const requiredSurvey = !isStaff
        ? program.surveys?.find(
            (s) => s.required && !s.skipForPrograms?.some((p) => homePrograms.has(p)),
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
      if (requiredSurvey) {
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
  // canAccessStaff gates the Workshops nav. Demote it in preview mode the
  // same way isAdmin / canSwitch are — otherwise a super-admin previewing
  // as an AI Literacy student still sees the Workshops link and the nav
  // doesn't fully match what a real student would experience.
  const canAccessStaff =
    canAccessStaffContent(userRole, email) && !previewingSlug;
  let programs: { slug: string; name: string; domain: string; dnsReady?: boolean }[] = [];
  if (canSwitch) {
    programs = getAllPrograms().map((p) => ({
      slug: p.slug,
      name: p.name,
      domain: p.domain,
      dnsReady: p.dnsReady,
    }));
    // Builder-created courses are now tracks inside Catalyst, not separate programs.
    // The switcher only shows TS-config programs; manage courses via /admin/courses.
  }

  // Only redirect staff with no tracks to Lunch & Learns when they're on
  // the Catalyst umbrella (no specific program context). Staff who are also
  // enrolled learners in a specific program (forte, forge, etc.) should land
  // on their program dashboard, not the L&L hub.
  const isUmbrellaContext = program.slug === "catalyst" || program.slug === "bcc-academy";
  const showLunchLearnSidebar =
    previewingSlug === LUNCH_LEARN_PREVIEW_SLUG ||
    (!isAdmin && enrolledTrackSlugs.length === 0 && !!email && isStaffEmail(email) && isUmbrellaContext);

  const navVariant: "admin-sidebar" | "student-sidebar" | "lunch-learn-sidebar" | "topbar" = isAdmin
    ? "admin-sidebar"
    : showLunchLearnSidebar
      ? "lunch-learn-sidebar"
      : enrolledTrackSlugs.length > 0
        ? "student-sidebar"
        : "topbar";

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
        showLunchLearnLink={isStaffEmail(email) && !isUmbrellaContext}
      />
    </>
  );
}

// Light-shell top bar (Meridian-style). Rendered inside <main> so it sticks
// above page content. Only for learner surfaces — admins keep the dark
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
  const programs = canSwitch
    ? getAllPrograms().map((p) => ({
        slug: p.slug,
        name: p.name,
        domain: p.domain,
        dnsReady: p.dnsReady,
      }))
    : [];

  return (
    <DashboardTopBar
      firstName={ctx.student?.first_name ?? ""}
      lastName={ctx.student?.last_name ?? ""}
      email={ctx.student?.email ?? ctx.userEmail}
      avatarUrl={ctx.student?.avatar_url ?? null}
      canSwitch={canSwitch}
      programs={programs}
      currentProgramSlug={program.slug}
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
  const previewGroupMap = new Map<
    string,
    { programSlug: string; programName: string; tracks: { slug: string; name: string }[] }
  >();
  const seenTrackSlugs = new Set<string>();
  for (const p of getJoinablePrograms()) {
    for (const t of p.tracks) {
      if (seenTrackSlugs.has(t.slug)) continue;
      seenTrackSlugs.add(t.slug);
      const home = getHomeProgramForTrack(t.slug);
      const homeSlug = home?.slug ?? p.slug;
      const homeName = home?.name ?? p.name;
      const group =
        previewGroupMap.get(homeSlug) ??
        { programSlug: homeSlug, programName: homeName, tracks: [] };
      group.tracks.push({ slug: t.slug, name: t.name });
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
      {showTutor && <TutorFab />}
      {canShowPreview && (
        <PreviewToggle previewingSlug={validPreviewSlug} groups={previewGroups} />
      )}
    </>
  );
}
