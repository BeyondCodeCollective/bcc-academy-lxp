"use client";

import { useState } from "react";

export type CourseRow = {
  slug: string;
  programSlug: string;
  name: string;
  joinUrl: string;
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
  function openCourse() {
    document.cookie = `program-override=${course.programSlug}; path=/; max-age=86400`;
    window.location.href = "/dashboard/admin";
  }

  return (
    <div
      onClick={openCourse}
      className="group flex items-center gap-4 px-4 py-4 cursor-pointer hover:bg-neutral-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 group-hover:text-[#E54D2E] transition-colors">
          {course.name}
        </p>
        <p className="font-mono text-xs text-neutral-400 mt-0.5 truncate">
          {course.joinUrl}
        </p>
      </div>
      <CopyButton url={course.joinUrl} />
      <span className="text-xs text-neutral-400 group-hover:text-[#E54D2E] transition-colors shrink-0 select-none">
        Manage →
      </span>
    </div>
  );
}

export function CoursesList({ courses }: { courses: CourseRow[] }) {
  return (
    <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white overflow-hidden">
      {courses.map((c) => (
        <CourseItem key={c.slug} course={c} />
      ))}
    </div>
  );
}
