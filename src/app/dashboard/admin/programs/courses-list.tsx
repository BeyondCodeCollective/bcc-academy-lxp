"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCourseAction, unarchiveCourseAction } from "./actions";
import { buttonClass } from "@/components/ui";

export type CourseRow = {
  slug: string;
  programSlug: string;
  name: string;
  joinUrl: string;
  archived: boolean;
  isEditable: boolean;
};

function IconButton({ onClick, title, children, className = "" }: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md border border-rule bg-white text-ink-soft hover:bg-paper-tint-soft transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) return <span className="text-[10px] font-semibold text-primary">✓</span>;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" />
      <path d="M0.5 4.5H3.5V13.5H9.5V10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CourseItem({ course }: { course: CourseRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCourse() {
    document.cookie = `program-override=${course.programSlug}; path=/; max-age=86400`;
    window.location.href = `/dashboard/admin?tab=${course.slug}`;
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(course.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="flex items-center gap-3 px-4 py-4 opacity-60">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-soft">{course.name}</p>
          <p className="font-mono text-xs text-ink-faint mt-0.5 truncate">{course.joinUrl}</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleUnarchive}
          className={`${buttonClass("secondary", "sm")} shrink-0`}
        >
          {isPending ? "Restoring…" : "Unarchive"}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-1 px-4 py-4">
      <div className="flex items-center gap-2">
        <div onClick={openCourse} className="flex-1 min-w-0 cursor-pointer">
          <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
            {course.name}
          </p>
          <p className="font-mono text-xs text-ink-faint mt-0.5 truncate">{course.joinUrl}</p>
        </div>

        <IconButton onClick={handleCopy} title="Copy join link">
          <CopyIcon copied={copied} />
        </IconButton>

        {course.isEditable && (
          <a
            href={`/dashboard/admin/programs/${course.slug}/edit`}
            onClick={(e) => e.stopPropagation()}
            title="Course settings"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md border border-rule bg-white text-ink-soft hover:bg-paper-tint-soft transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="2" stroke="currentColor" />
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.929 2.929l1.06 1.06M10.01 10.01l1.06 1.06M11.07 2.929l-1.06 1.06M3.99 10.01l-1.06 1.06" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </a>
        )}

        {course.isEditable && !confirming && (
          <IconButton
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            title="Archive course"
            className="hover:border-red-300 hover:text-red-500"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="13" height="3" rx="0.5" stroke="currentColor" />
              <path d="M1.5 4v8.5a1 1 0 001 1h9a1 1 0 001-1V4" stroke="currentColor" strokeLinecap="round" />
              <path d="M5 7.5h4" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </IconButton>
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
            className="shrink-0 text-xs text-ink-soft hover:text-ink-soft transition-colors"
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
      <div className="divide-y divide-neutral-100 rounded-lg border border-rule bg-white overflow-hidden">
        {courses.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-faint text-center">No active courses.</p>
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
            className="text-sm text-ink-faint hover:text-ink-soft transition-colors"
          >
            {showArchived ? "▾" : "▸"} Archived ({archivedCourses.length})
          </button>
          {showArchived && (
            <div className="mt-2 divide-y divide-neutral-100 rounded-lg border border-rule bg-white overflow-hidden">
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
