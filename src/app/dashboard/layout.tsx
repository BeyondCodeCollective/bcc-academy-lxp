import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { getProgram } from "@/lib/programs/server";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms, canAccessStaffContent } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
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
  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    const role = ctx.student?.role ?? "";
    userRole = role;
    isAdmin = canAccessAdminPanel(role);
    canSwitch = canSwitchPrograms(role);
    firstName = ctx.student?.first_name ?? "";
    lastName = ctx.student?.last_name ?? "";
    email = ctx.student?.email ?? ctx.userEmail;
    avatarUrl = ctx.student?.avatar_url ?? null;
    if (!isAdmin && !isSurveyPage) {
      const supabase = await createClient();
      const isStaff = isStaffEmail(email);
      if (
        !BCC_INTAKE_EXEMPT_PROGRAMS.includes(program.slug) &&
        !isStaff
      ) {
        const { data: intakeRow } = await supabase
          .from("survey_responses")
          .select("completed_at")
          .eq("student_id", ctx.userId)
          .eq("survey_type", BCC_INTAKE_SURVEY_ID)
          .not("completed_at", "is", null)
          .maybeSingle();
        if (!intakeRow) {
          redirect(`/dashboard/survey/${BCC_INTAKE_SURVEY_ID}`);
        }
      }
      const requiredSurvey = !isStaff
        ? program.surveys?.find((s) => s.required)
        : undefined;
      if (requiredSurvey) {
        const { data: surveyRow } = await supabase
          .from("survey_responses")
          .select("completed_at")
          .eq("student_id", ctx.userId)
          .eq("survey_type", requiredSurvey.id)
          .not("completed_at", "is", null)
          .maybeSingle();
        if (!surveyRow) {
          redirect(`/dashboard/survey/${requiredSurvey.id}`);
        }
      }
      if (program.tracks.length > 0) {
        const enrolled = await getEnrolledTracks(supabase, ctx.userId, program);
        enrolledTrackSlugs = enrolled.map((t) => t.slug);
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

  // Nav variant: admin → sidebar with admin items; enrolled student → sidebar
  // with curriculum weeks; unenrolled student → horizontal top bar.
  const navVariant: "admin-sidebar" | "student-sidebar" | "topbar" = isAdmin
    ? "admin-sidebar"
    : enrolledTrackSlugs.length > 0
      ? "student-sidebar"
      : "topbar";
  const hasSidebar = navVariant !== "topbar";

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
      />
      {!isSurveyPage && showTutor && <TutorFab />}
      <main
        id="dashboard-main"
        className={`flex-1 bg-paper ${hasSidebar ? "md:pl-60" : ""}`}
      >
        {!isSurveyPage && (
          <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-2 px-4 pt-3 sm:px-5">
            <TextScaleToggle compact />
            <ReadAloudButton selector="#dashboard-main" />
          </div>
        )}
        {children}
      </main>
    </ProgramProvider>
  );
}
