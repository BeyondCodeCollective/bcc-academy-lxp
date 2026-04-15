import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import { ProgramProvider } from "@/lib/programs/context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const program = await getProgram();
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");
    const user = session.user;

    const { data: student } = await supabase
      .from("students")
      .select("role")
      .eq("id", user.id)
      .single<Pick<Student, "role">>();

    isAdmin = student?.role === "admin";
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;

    if (!demoEmail) redirect("/");

    const user = getDemoUser(demoEmail);
    isAdmin = user?.role === "admin" || false;
  }

  const showTutor = program.tutorConfig?.enabled !== false;

  return (
    <ProgramProvider program={program}>
      <Nav isAdmin={isAdmin} logo={program.logo} programName={program.name} showTutor={showTutor} />
      <main className="flex-1 bg-stone-50">{children}</main>
      {showTutor && <TutorFab />}
    </ProgramProvider>
  );
}
