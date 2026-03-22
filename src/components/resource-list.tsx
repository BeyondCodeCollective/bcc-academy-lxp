"use client";

import { useState } from "react";
import {
  FileText,
  BookOpen,
  Video,
  Briefcase,
  ChevronDown,
  X,
} from "lucide-react";
import type { Resource } from "@/lib/types";

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  course_materials: BookOpen,
  recordings: Video,
  career_prep: Briefcase,
  program_info: FileText,
};

const CATEGORY_LABELS: Record<string, string> = {
  course_materials: "Course Materials",
  recordings: "Recordings",
  career_prep: "Career Prep",
  program_info: "Program Info",
};

const CATEGORY_ORDER = [
  "program_info",
  "course_materials",
  "recordings",
  "career_prep",
];

type ResourceWithContent = Resource & { content?: string };

export function ResourceList({
  resources,
}: {
  resources: ResourceWithContent[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Group by category
  const grouped: Record<string, ResourceWithContent[]> = {};
  resources.forEach((r) => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  const openResource = resources.find((r) => r.id === openId);

  return (
    <>
      {/* Resource cards */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          const Icon = CATEGORY_ICONS[cat] || FileText;

          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} className="text-neutral-400" />
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
              </div>
              <div className="space-y-2">
                {items.map((resource) => (
                  <button
                    key={resource.id}
                    onClick={() =>
                      setOpenId(openId === resource.id ? null : resource.id)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      openId === resource.id
                        ? "border-neutral-900 bg-white shadow-sm"
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {resource.title}
                      </p>
                      {resource.description && (
                        <p className="mt-0.5 text-xs text-neutral-400 truncate">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-neutral-400 transition-transform ${
                        openId === resource.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline content panel — slides open below the card */}
      {openResource?.content && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-neutral-900">
                {openResource.title}
              </p>
              {openResource.description && (
                <p className="mt-0.5 text-sm text-neutral-400">
                  {openResource.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setOpenId(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="prose prose-sm prose-neutral max-w-none">
            {openResource.content.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <h3
                    key={i}
                    className="mt-4 mb-2 text-sm font-semibold text-neutral-900 first:mt-0"
                  >
                    {line.replace(/\*\*/g, "")}
                  </h3>
                );
              }
              if (line.startsWith("•")) {
                return (
                  <p key={i} className="ml-3 text-sm text-neutral-600 leading-relaxed">
                    {line}
                  </p>
                );
              }
              if (line.trim() === "") return <div key={i} className="h-2" />;
              // Handle inline bold
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p key={i} className="text-sm text-neutral-600 leading-relaxed">
                  {parts.map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={j} className="font-semibold text-neutral-900">
                        {part.replace(/\*\*/g, "")}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
