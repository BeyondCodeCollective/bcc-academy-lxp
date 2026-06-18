import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { CreateCourseForm } from "./create-course-form";
import { PageHeader } from "@/components/page-header";

export default async function NewCoursePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <div>
        <PageHeader title="New Course" subtitle="Takes about 30 seconds." />
      </div>
      <CreateCourseForm />
    </div>
  );
}
