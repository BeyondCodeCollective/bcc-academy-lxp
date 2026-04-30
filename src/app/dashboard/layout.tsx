import { Suspense } from "react";
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
import { canAccessAdminPanel } from "@/lib/roles";
import { getSessionContext } from "@/lib/auth/session";
import type { ProgramConfig } from "@/lib/programs/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [program, headersList] = await Promise.all([getProgram(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";
  const isSurveyPage = pathname.startsWith("/dashboard/survey");

  return (
    <ProgramProvider program={program}>
      <Suspense fallback={<NavShell program={program} minimal={isSurveyPage} />}>
        <NavWithAuth program={program} minimal={isSurveyPage} />
      </Suspense>
      <main
        id="dashboard-main"
        className="flex-1 bg-stone-50"
      >
        {/* Accessibility controls — text size + read-aloud. Sits once at
            the top of every dashboard page so students never have to hunt
            for them. Read-aloud reads everything inside #dashboard-main
            (nav chrome is skipped by the button's own tree walker). */}
        <div className="mx-auto flex w-full max-w-2xl md:max-w-5xl items-center justify-end gap-2 px-4 sm:px-5 pt-3">
          <ReadAloudButton selector="#dashboard-main" label="Read aloud" />
          <TextScaleToggle compact />
        </div>
        {children}
      </main>
    </ProgramProvider>
  );
}

async function NavWithAuth({ program, minimal }: { program: ProgramConfig; minimal?: boolean }) {
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    isAdmin = canAccessAdminPanel(ctx.student?.role ?? "");
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    if (!demoEmail) redirect("/");
    const user = getDemoUser(demoEmail);
    isAdmin = canAccessAdminPanel(user?.role ?? "");
  }

  const showTutor = program.tutorConfig?.enabled !== false;
  const showResources = program.resourcesEnabled === true;

  return (
    <>
      <Nav
        isAdmin={isAdmin}
        logo={program.logo}
        programName={program.name}
        showTutor={showTutor}
        showResources={showResources}
        minimal={minimal}
      />
      {!minimal && showTutor && <TutorFab />}
    </>
  );
}

function NavShell({ program, minimal }: { program: ProgramConfig; minimal?: boolean }) {
  const showResources = program.resourcesEnabled === true;
  return (
    <Nav
      isAdmin={false}
      logo={program.logo}
      programName={program.name}
      showTutor={false}
      showResources={showResources}
      minimal={minimal}
    />
  );
}
