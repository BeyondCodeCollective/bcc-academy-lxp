"use client";

import { useState } from "react";
import { CreateCourseForm } from "./create-course-form";
import { ImportCourseForm } from "./import-course-form";

/** Manual entry stays super-admin-only because createCourseAction still
 *  requires it; importing is open to any admin. When only one mode is
 *  available there's nothing to switch between, so the tabs are hidden. */
export function NewCourseTabs({
  canCreateManually,
  extraProgram,
}: {
  canCreateManually: boolean;
  /** Admin-created organization to file the course under, from ?program=. */
  extraProgram?: { slug: string; name: string };
}) {
  // Landing here from an organization means the course belongs to that org, so
  // open on manual entry — the importer has no program picker.
  const [mode, setMode] = useState<"import" | "manual">(extraProgram ? "manual" : "import");

  if (!canCreateManually) return <ImportCourseForm />;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
        {(["import", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {m === "import" ? "From a link" : "Enter manually"}
          </button>
        ))}
      </div>

      {mode === "import" ? <ImportCourseForm /> : <CreateCourseForm extraProgram={extraProgram} />}
    </div>
  );
}
