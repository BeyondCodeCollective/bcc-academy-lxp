import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canSwitchPrograms } from "@/lib/roles";
import { NewCourseTabs } from "./new-course-tabs";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";

export default async function NewCoursePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  if (!canManageStudents(role)) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <div>
        <PageHeader title="New Course" subtitle="Takes about 30 seconds." actions={<ManageMenu />} />
      </div>
      <NewCourseTabs canCreateManually={canSwitchPrograms(role)} />
    </div>
  );
}
