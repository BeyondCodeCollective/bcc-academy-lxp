import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { getProgram } from "@/lib/programs/server";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import { getAllPrograms } from "@/lib/programs";

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
  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    const role = ctx.student?.role ?? "";
    isAdmin = canAccessAdminPanel(role);
    canSwitch = canSwitchPrograms(role);
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    if (!demoEmail) redirect("/");
    const user = getDemoUser(demoEmail);
    const role = user?.role ?? "";
    isAdmin = canAccessAdminPanel(role);
    canSwitch = canSwitchPrograms(role);
  }

  const showTutor = program.tutorConfig?.enabled !== false;
  const showResources = program.resourcesEnabled === true;
  const programs = canSwitch
    ? getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }))
    : [];

  return (
    <ProgramProvider program={program}>
      <Nav
        isAdmin={isAdmin}
        logo={program.logo}
        programName={program.name}
        showTutor={showTutor}
        showResources={showResources}
        minimal={isSurveyPage}
        programs={programs}
        currentProgramSlug={program.slug}
      />
      {!isSurveyPage && showTutor && <TutorFab />}
      <main
        id="dashboard-main"
        className="flex-1 bg-paper md:pl-60"
      >
        <div className="mx-auto flex w-full max-w-2xl md:max-w-5xl items-center justify-end gap-2 px-4 sm:px-5 pt-3">
          <ReadAloudButton selector="#dashboard-main" label="Read aloud" />
          <TextScaleToggle compact />
        </div>
        {children}
      </main>
    </ProgramProvider>
  );
}
