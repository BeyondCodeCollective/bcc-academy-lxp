import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import { getProgram } from "@/lib/programs/server";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getAllPrograms, isTutorAvailable } from "@/lib/programs";

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
  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    const role = ctx.student?.role ?? "";
    isAdmin = canAccessAdminPanel(role);
    canSwitch = canSwitchPrograms(role);
    firstName = ctx.student?.first_name ?? "";
    lastName = ctx.student?.last_name ?? "";
    email = ctx.student?.email ?? ctx.userEmail;
    avatarUrl = ctx.student?.avatar_url ?? null;
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    if (!demoEmail) redirect("/");
    const user = getDemoUser(demoEmail);
    const role = user?.role ?? "";
    isAdmin = canAccessAdminPanel(role);
    canSwitch = canSwitchPrograms(role);
    firstName = user?.first_name ?? "";
    lastName = user?.last_name ?? "";
    email = user?.email ?? demoEmail;
  }

  // AI Tutor pre-launch kill-switch lives in src/lib/programs/index.ts.
  const showTutor = isTutorAvailable(program);
  const programs = canSwitch
    ? getAllPrograms().map((p) => ({ slug: p.slug, name: p.name, domain: p.domain }))
    : [];

  return (
    <ProgramProvider program={program}>
      <Nav
        isAdmin={isAdmin}
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
      />
      {!isSurveyPage && showTutor && <TutorFab />}
      <main
        id="dashboard-main"
        className="flex-1 bg-paper md:pl-60"
      >
        {children}
      </main>
    </ProgramProvider>
  );
}
