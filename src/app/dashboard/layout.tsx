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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const program = await getProgram();
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
    <ProgramProvider program={program}>
      <Nav
        isAdmin={isAdmin}
        logo={program.logo}
        programName={program.name}
        showTutor={showTutor}
        showResources={showResources}
      />
      <main className="flex-1 bg-stone-50">{children}</main>
      {showTutor && isAdmin && <TutorFab />}
    </ProgramProvider>
  );
}
