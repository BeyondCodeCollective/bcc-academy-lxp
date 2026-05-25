import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured, createClient, createServiceClient } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import { PreviewToggle } from "@/components/preview-toggle";
import { getProgram } from "@/lib/programs/server";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms, canAccessStaffContent } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getAllPrograms, isTutorAvailable } from "@/lib/programs";
import { getEnrolledTracks } from "@/lib/enrollment";
import { BCC_INTAKE_SURVEY_ID, BCC_INTAKE_EXEMPT_PROGRAMS } from "@/lib/surveys/platform";
import { isStaffEmail } from "@/lib/auth/admins";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [program, headersList] = await Promise.all([getProgram(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";
  const isSurveyPage = pathname.startsWith("/dashboard/survey");

  // Resolve auth synchronously with the layout so the nav renders in its
  // final shape on first paint. The previous Suspense + NavShell pattern
  // caused a visible layout shift when admin items / the program switcher
  // popped in once auth resolved — most noticeable when switching programs.
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
    // Super-admins can pick a single track to "preview as enrolled in".
    // Downstream we treat them as a regular student enrolled in just that
    // track — student-sidebar curriculum nav, dashboard filtered, etc.
    isAdmin = actualIsAdmin && !validPreviewSlug;
    canSwitch = canSwitchPrograms(role) && !validPreviewSlug;
    canShowPreviewToggle = canSwitchPrograms(role);
    previewingSlug = validPreviewSlug;
    firstName = ctx.student?.first_name ?? "";
    lastName = ctx.student?.last_name ?? "";
    email = ctx.student?.email ?? ctx.userEmail;
    avatarUrl = ctx.student?.avatar_url ?? null;
    if (validPreviewSlug && validPreviewSlug !== LUNCH_LEARN_PREVIEW_SLUG) {
      // Fake enrollment in exactly the previewed track. Lunch & Learns uses
      // a top-bar nav (no curriculum sidebar), so we skip enrollment faking
      // for that sentinel.
      enrolledTrackSlugs = [validPreviewSlug];
    }
    if (!isAdmin && !isSurveyPage && !validPreviewSlug) {
      const supabase = await createClient();
      const isStaff = isStaffEmail(email);
      const needsIntakeCheck =
        !BCC_INTAKE_EXEMPT_PROGRAMS.includes(program.slug) && !isStaff;
      const requiredSurvey = !isStaff
        ? program.surveys?.find((s) => s.required)
        : undefined;
      const needsEnrollment = program.tracks.length > 0;

      // Issue all three queries in one round-trip — previously they were
      // sequential and added ~3× the latency on every dashboard navigation.
      const [intakeRes, surveyRes, enrolledRes] = await Promise.all([
        needsIntakeCheck
          ? supabase
              .from("survey_responses")
              .select("completed_at")
              .eq("student_id", ctx.userId)
              .eq("survey_type", BCC_INTAKE_SURVEY_ID)
              .not("completed_at", "is", null)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        requiredSurvey
          ? supabase
              .from("survey_responses")
              .select("completed_at")
              .eq("student_id", ctx.userId)
              .eq("survey_type", requiredSurvey.id)
              .not("completed_at", "is", null)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        needsEnrollment
          ? getEnrolledTracks(supabase, ctx.userId, program)
          : Promise.resolve([]),
      ]);

      if (needsIntakeCheck && !intakeRes.data) {
        redirect(`/dashboard/survey/${BCC_INTAKE_SURVEY_ID}`);
      }
      if (requiredSurvey && !surveyRes.data) {
        redirect(`/dashboard/survey/${requiredSurvey.id}`);
      }
      if (needsEnrollment) {
        enrolledTrackSlugs = enrolledRes.map((t) => t.slug);
      }
    } else if (!isAdmin && isSurveyPage) {
      // No enrollment query needed on survey pages
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

  // AI Tutor pre-launch kill-switch lives in src/lib/programs/index.ts.
  const showTutor = isTutorAvailable(program);
  const canAccessStaff = canAccessStaffContent(userRole, email);
  const programs = canSwitch
    ? getAllPrograms().map((p) => ({
        slug: p.slug,
        name: p.name,
        domain: p.domain,
        dnsReady: p.dnsReady,
      }))
    : [];

  // Lunch & Learns get their own sidebar variant — staff users or super-admins
  // previewing as L&L see a vertical list of recordings instead of the topbar.
  const showLunchLearnSidebar =
    previewingSlug === LUNCH_LEARN_PREVIEW_SLUG ||
    (!isAdmin && enrolledTrackSlugs.length === 0 && !!email && isStaffEmail(email));

  // Nav variant: admin → sidebar with admin items; enrolled student → sidebar
  // with curriculum weeks; L&L viewer → sidebar with recordings; otherwise topbar.
  const navVariant: "admin-sidebar" | "student-sidebar" | "lunch-learn-sidebar" | "topbar" = isAdmin
    ? "admin-sidebar"
    : showLunchLearnSidebar
      ? "lunch-learn-sidebar"
      : enrolledTrackSlugs.length > 0
        ? "student-sidebar"
        : "topbar";
  const hasSidebar = navVariant !== "topbar";

  // Fetch L&L recording list for the sidebar (only when actually rendering it).
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

  // Serialize track info for the curriculum sidebar (student-sidebar only).
  const curriculumTracks =
    navVariant === "student-sidebar"
      ? program.tracks
          .filter((t) => enrolledTrackSlugs.includes(t.slug))
          .map((t) => ({
            slug: t.slug,
            shortName: t.shortName,
            startDate: t.startDate,
            totalWeeks: t.totalWeeks,
            lastSessionDayOffset: t.lastSessionDayOffset,
            weekSummaries: t.weekSummaries.map((ws) => ({
              week: ws.week,
              topic: ws.topic,
              icon: ws.icon,
            })),
          }))
      : [];

  // Admin tracks for the admin sidebar nav.
  const adminTracks = isAdmin
    ? program.tracks.map((t) => ({ slug: t.slug, shortName: t.shortName }))
    : [];

  return (
    <ProgramProvider program={program}>
      <Nav
        isAdmin={isAdmin}
        canAccessStaff={canAccessStaff}
        logo={program.logo}
        programName={program.name}
        showTutor={showTutor}
        minimal={isSurveyPage}
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
      />
      {!isSurveyPage && showTutor && <TutorFab />}
      {!isSurveyPage && canShowPreviewToggle && (
        <PreviewToggle
          previewingSlug={previewingSlug}
          tracks={[
            { slug: LUNCH_LEARN_PREVIEW_SLUG, name: "Lunch & Learns" },
            ...program.tracks.map((t) => ({ slug: t.slug, name: t.name })),
          ]}
        />
      )}
      <main
        id="dashboard-main"
        className={`flex-1 bg-paper ${hasSidebar ? "md:pl-60" : ""}`}
        style={{ fontSize: "16px" }}
      >
        {children}
      </main>
    </ProgramProvider>
  );
}
