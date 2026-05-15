import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveCurrentUser } from "@/lib/current-user";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function InstructorGuidePage() {
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");
  if (!canAccessAdminPanel(currentUser.userRole)) redirect("/dashboard");
  redirect("/dashboard/help#instructor-guide");
}
