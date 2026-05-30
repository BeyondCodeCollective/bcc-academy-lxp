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
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          ← All Programs
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-100">
          New Course
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Takes about 30 seconds.</p>
      </div>
      <CreateCourseForm />
    </div>
  );
}
