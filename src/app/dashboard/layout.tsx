import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import { ProgramProvider } from "@/lib/programs/context";
import { canAccessAdminPanel } from "@/lib/roles";

const SUPER_ADMIN_EMAILS = [
  "fonz.morris@wearebgc.org",
  "admin@wearebgc.org",
];

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

    // Use service client to bypass RLS for role check
    const svc = createServiceClient();
    const { data: student } = await svc
      .from("students")
      .select("role, email")
      .eq("id", user.id)
      .single();

    // Auto-fix: enforce super_admin for hardcoded emails on every page load
    const email = (student?.email || user.email || "").toLowerCase();
    if (SUPER_ADMIN_EMAILS.includes(email) && student?.role !== "super_admin") {
      await svc.from("students").update({ role: "super_admin" }).eq("id", user.id);
      isAdmin = true;
    } else {
      isAdmin = canAccessAdminPanel(student?.role ?? "");
    }
  } else {
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;

    if (!demoEmail) redirect("/");

    const user = getDemoUser(demoEmail);
    isAdmin = canAccessAdminPanel(user?.role ?? "");
  }

  const showTutor = program.tutorConfig?.enabled !== false;

  return (
    <ProgramProvider program={program}>
      <Nav isAdmin={isAdmin} logo={program.logo} programName={program.name} showTutor={showTutor} />
      <main className="flex-1 bg-stone-50">{children}</main>
      {showTutor && isAdmin && <TutorFab />}
    </ProgramProvider>
  );
}
