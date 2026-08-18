"use client";

import { useRouter } from "next/navigation";
import { fieldInput } from "@/components/ui";

/** Course dropdown; changing it navigates to that course's signups. */
export function CourseSelect({
  courses,
  value,
}: {
  courses: { slug: string; name: string; count: number }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      Course
      <select
        value={value}
        onChange={(e) => router.push(`/dashboard/admin/landing-signups?course=${encodeURIComponent(e.target.value)}`)}
        className={`${fieldInput} w-auto`}
      >
        <option value="" disabled>
          Choose a course
        </option>
        {courses.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name} ({c.count})
          </option>
        ))}
      </select>
    </label>
  );
}
