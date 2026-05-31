import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { CreateCourseForm } from "./create-course-form";

export default async function NewCoursePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <div>
        <Link
          href="/dashboard/admin/programs"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-2"
        >
          ← All Programs
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          New Course
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Takes about 30 seconds.</p>
      </div>
      <CreateCourseForm />
    </div>
  );
}
