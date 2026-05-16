import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel, canAccessStaffContent } from "@/lib/roles";
import { LunchLearnHub } from "@/components/lunch-learn-hub";

export const dynamic = "force-dynamic";

export default async function LunchLearnListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  const email = ctx.student?.email ?? ctx.userEmail ?? null;
  if (!canAccessStaffContent(role, email)) {
    redirect("/dashboard");
  }

  return (
    <LunchLearnHub
      isAdmin={canAccessAdminPanel(role)}
      firstName={ctx.student?.first_name || ""}
    />
  );
}
