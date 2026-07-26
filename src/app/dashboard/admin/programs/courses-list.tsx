"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hideCourseAction, showCourseAction, deleteCourseAction } from "./actions";
import { buttonClass } from "@/components/ui";

export type CourseRow = {
  slug: string;
  programSlug: string;
  name: string;
  joinUrl: string;
  hidden: boolean;
  isEditable: boolean;
};

export type ProgramGroup = {
  programSlug: string;
  programName: string;
  active: CourseRow[];
  hidden: CourseRow[];
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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // What's standing in the way of a delete, so the row can say so instead of
  // just refusing.
  const [blockedBy, setBlockedBy] = useState<{ label: string; count: number }[] | null>(null);

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

  function toggleHidden(hide: boolean, e?: React.MouseEvent) {
    e?.stopPropagation();
    setError(null);
    startTransition(async () => {
      const res = hide
        ? await hideCourseAction(course.programSlug, course.slug)
        : await showCourseAction(course.programSlug, course.slug);
      if (res.success) router.refresh();
      else setError(res.error ?? "Something went wrong.");
    });
  }

  function handleDelete(e?: React.MouseEvent) {
    e?.stopPropagation();
    setError(null);
    setBlockedBy(null);
    startTransition(async () => {
      const res = await deleteCourseAction(course.programSlug, course.slug);
      if (res.success) {
        setConfirmDelete(false);
        router.refresh();
      } else {
        setError(res.error);
        setBlockedBy(res.blockedBy ?? null);
        setConfirmDelete(false);
      }
    });
  }

  // Hidden row — muted, with Show to restore and Delete to remove for good.
  // Delete only exists here: you have to retire a course before you can erase
  // it, so a stray click on a live course can't destroy anything.
  if (course.hidden) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 opacity-60">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-soft truncate">{course.name}</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          {blockedBy && blockedBy.length > 0 && (
            <p className="text-xs text-ink-soft mt-1">
              {blockedBy.map((b) => `${b.count} ${b.label}`).join(" · ")}
            </p>
          )}
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-ink-soft">Delete for good?</span>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="border border-red-600 bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-medium text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isPending}
              onClick={() => toggleHidden(false)}
              className={buttonClass("secondary", "sm")}
            >
              {isPending ? "Showing…" : "Show"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-medium text-ink-faint underline-offset-2 hover:text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 px-4 py-3.5">
      <div onClick={openCourse} className="flex-1 min-w-0 cursor-pointer">
        <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors truncate">
          {course.name}
        </p>
        <p className="font-mono text-xs text-ink-faint mt-0.5 truncate">{course.joinUrl}</p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
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

      <button
        type="button"
        disabled={isPending}
        onClick={(e) => toggleHidden(true, e)}
        title="Hide course (reversible — keeps all data)"
        className={`${buttonClass("ghost", "sm")} shrink-0`}
      >
        {isPending ? "Hiding…" : "Hide"}
      </button>
    </div>
  );
}

function ProgramSection({ group }: { group: ProgramGroup }) {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {group.programName}
      </p>
      <div className="divide-y divide-neutral-100 rounded-lg border border-rule bg-white overflow-hidden">
        {group.active.length === 0 && (
          <p className="px-4 py-5 text-sm text-ink-faint text-center">No visible courses.</p>
        )}
        {group.active.map((c) => (
          <CourseItem key={c.slug} course={c} />
        ))}
      </div>

      {group.hidden.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="px-1 text-xs text-ink-faint hover:text-ink-soft transition-colors"
          >
            {showHidden ? "▾" : "▸"} Hidden ({group.hidden.length})
          </button>
          {showHidden && (
            <div className="mt-2 divide-y divide-neutral-100 rounded-lg border border-rule bg-white overflow-hidden">
              {group.hidden.map((c) => (
                <CourseItem key={c.slug} course={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CoursesList({ groups }: { groups: ProgramGroup[] }) {
  if (groups.length === 0) {
    return <p className="px-4 py-6 text-sm text-ink-faint text-center">No courses yet.</p>;
  }
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <ProgramSection key={g.programSlug} group={g} />
      ))}
    </div>
  );
}
