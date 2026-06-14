import { redirect } from "next/navigation";
import Link from "next/link";
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
        <Link
          href="/dashboard/admin/programs"
          className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-2"
        >
          ← All Courses
        </Link>
        <PageHeader title="New Course" subtitle="Takes about 30 seconds." />
      </div>
      <CreateCourseForm />
    </div>
  );
}
