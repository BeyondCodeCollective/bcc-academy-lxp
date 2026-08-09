"use client";

import { useState } from "react";
import { CreateCourseForm } from "./create-course-form";
import { ImportCourseForm } from "./import-course-form";

type Mode = "generate" | "import" | "manual";

const LABELS: Record<Mode, string> = {
  generate: "Generate with AI",
  import: "From a link",
  manual: "Enter manually",
};

/** Manual entry stays super-admin-only because createCourseAction still
 *  requires it; generating and importing are open to any admin. */
export function NewCourseTabs({
  canCreateManually,
  extraProgram,
  currentProgram,
}: {
  canCreateManually: boolean;
  /** Admin-created organization to file the course under, from ?program=. */
  extraProgram?: { slug: string; name: string };
  /** The program context the admin is standing in (domain/switcher cookie). */
  currentProgram?: { slug: string; name: string };
}) {
  // Landing here from an organization means the course belongs to that org, so
  // open on manual entry — the importer has no program picker.
  const [mode, setMode] = useState<Mode>(extraProgram ? "manual" : "generate");
  const modes: Mode[] = canCreateManually
    ? ["generate", "import", "manual"]
    : ["generate", "import"];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {mode === "manual" ? (
        <CreateCourseForm extraProgram={extraProgram} currentProgram={currentProgram} />
      ) : (
        <ImportCourseForm
          key={mode}
          variant={mode}
          currentProgram={currentProgram}
        />
      )}
    </div>
  );
}
