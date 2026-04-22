import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
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
  const program = await getProgram();

  return (
    <ProgramProvider program={program}>
      <Suspense fallback={<NavShell program={program} />}>
        <NavWithAuth program={program} />
      </Suspense>
      <main className="flex-1 bg-stone-50">{children}</main>
    </ProgramProvider>
  );
}

async function NavWithAuth({ program }: { program: ProgramConfig }) {
  const t0 = performance.now();
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

  console.log(`[layout] dashboard nav ${Math.round(performance.now() - t0)}ms`);

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
      />
      {showTutor && isAdmin && <TutorFab />}
    </>
  );
}

function NavShell({ program }: { program: ProgramConfig }) {
  const showResources = program.resourcesEnabled === true;
  return (
    <Nav
      isAdmin={false}
      logo={program.logo}
      programName={program.name}
      showTutor={false}
      showResources={showResources}
    />
  );
}
