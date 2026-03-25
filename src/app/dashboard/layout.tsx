import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { Nav } from "@/components/nav";
import { TutorFab } from "@/components/tutor-fab";
import type { Student } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    // Demo mode — check cookie
    const cookieStore = await cookies();
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;

    if (!demoEmail) redirect("/");

    const user = getDemoUser(demoEmail);
    isAdmin = user?.role === "admin" || false;
  }

  return (
    <>
      <Nav isAdmin={isAdmin} />
      <div className="flex-1">{children}</div>
      <TutorFab />
    </>
  );
}
