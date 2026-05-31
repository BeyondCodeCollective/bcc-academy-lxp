"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCourseAction, unarchiveCourseAction } from "./actions";

export type CourseRow = {
  slug: string;
  programSlug: string;
  name: string;
  joinUrl: string;
  archived: boolean;
  isEditable: boolean;
};

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function CourseItem({ course }: { course: CourseRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCourse() {
    document.cookie = `program-override=${course.programSlug}; path=/; max-age=86400`;
    window.location.href = `/dashboard/admin?tab=${course.slug}`;
  }

  async function handleArchive() {
    setError(null);
    startTransition(async () => {
      const res = await archiveCourseAction(course.slug);
      if (res.success) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to archive.");
      }
    });
  }

  async function handleUnarchive() {
    setError(null);
    startTransition(async () => {
      const res = await unarchiveCourseAction(course.slug);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error ?? "Failed to unarchive.");
      }
    });
  }

  if (course.archived) {
    return (
      <div className="flex items-center gap-4 px-4 py-4 opacity-60">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-500">{course.name}</p>
          <p className="font-mono text-xs text-neutral-400 mt-0.5 truncate">{course.joinUrl}</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleUnarchive}
          className="shrink-0 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          {isPending ? "Restoring…" : "Unarchive"}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-1 px-4 py-4">
      <div className="flex items-center gap-4">
        <div
          onClick={openCourse}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <p className="text-sm font-semibold text-neutral-900 group-hover:text-[#E54D2E] transition-colors">
            {course.name}
          </p>
          <p className="font-mono text-xs text-neutral-400 mt-0.5 truncate">{course.joinUrl}</p>
        </div>
        <CopyButton url={course.joinUrl} />
        {course.isEditable && (
          <a
            href={`/dashboard/admin/programs/${course.slug}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Edit
          </a>
        )}
        <span
          onClick={openCourse}
          className="text-xs text-neutral-400 group-hover:text-[#E54D2E] transition-colors shrink-0 select-none cursor-pointer"
        >
          Manage →
        </span>
        {course.isEditable && !confirming && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="shrink-0 text-xs text-neutral-400 hover:text-red-600 transition-colors"
          >
            Archive
          </button>
        )}
      </div>

      {confirming && (
        <div className="flex items-center gap-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 mt-1">
          <p className="flex-1 text-xs text-red-700">
            Archive this course? Students will lose access immediately.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleArchive}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Archiving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="shrink-0 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function CoursesList({
  courses,
  archivedCourses,
}: {
  courses: CourseRow[];
  archivedCourses: CourseRow[];
}) {
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="space-y-4">
      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {courses.length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-400 text-center">No active courses.</p>
        )}
        {courses.map((c) => (
          <CourseItem key={c.slug} course={c} />
        ))}
      </div>

      {archivedCourses.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            {showArchived ? "▾" : "▸"} Archived ({archivedCourses.length})
          </button>
          {showArchived && (
            <div className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white overflow-hidden">
              {archivedCourses.map((c) => (
                <CourseItem key={c.slug} course={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
