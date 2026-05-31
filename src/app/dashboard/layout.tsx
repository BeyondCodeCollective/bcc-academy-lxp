import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured, createClient, createServiceClient } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import { PreviewToggle } from "@/components/preview-toggle";
import { getProgram } from "@/lib/programs/server";
import { getProgramBySlug, getAllPrograms, isTutorAvailable } from "@/lib/programs";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms, canAccessStaffContent } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getPreviewTrackSlug, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getEnrolledTracks } from "@/lib/enrollment";
import { BCC_INTAKE_SURVEY_ID, BCC_INTAKE_EXEMPT_PROGRAMS } from "@/lib/surveys/platform";
import { isStaffEmail } from "@/lib/auth/admins";

function NavSkeleton() {
  return (
    <nav className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-ink animate-pulse">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/10">
        <div className="h-7 w-7 rounded bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
      <div className="flex-1 space-y-1 p-3">
        <div className="h-11 rounded bg-white/10" />
        <div className="h-11 rounded bg-white/10" />
        <div className="h-11 rounded bg-white/10" />
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

  return (
    <ProgramProvider program={baseProgram}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Suspense fallback={isSurveyPage ? null : <NavSkeleton />}>
          <NavShell isSurveyPage={isSurveyPage} />
        </Suspense>
        <main
          id="dashboard-main"
          className={`flex-1 bg-paper ${isSurveyPage ? "" : "md:pl-60"}`}
          style={{ fontSize: "16px" }}
        >
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
      const needsIntakeCheck =
        !BCC_INTAKE_EXEMPT_PROGRAMS.includes(program.slug) && !isStaff;
      const requiredSurvey = !isStaff
        ? program.surveys?.find((s) => s.required)
        : undefined;
      const needsEnrollment = program.tracks.length > 0;

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

  const showLunchLearnSidebar =
    previewingSlug === LUNCH_LEARN_PREVIEW_SLUG ||
    (!isAdmin && enrolledTrackSlugs.length === 0 && !!email && isStaffEmail(email));

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
      />
    </>
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

  return (
    <>
      {showTutor && <TutorFab />}
      {canShowPreview && (
        <PreviewToggle
          previewingSlug={validPreviewSlug}
          tracks={[
            { slug: LUNCH_LEARN_PREVIEW_SLUG, name: "Lunch & Learns" },
            ...program.tracks.map((t) => ({ slug: t.slug, name: t.name })),
          ]}
        />
      )}
    </>
  );
}
