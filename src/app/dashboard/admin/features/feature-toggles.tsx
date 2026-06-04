"use client";

import { useTransition } from "react";
import { toggleAssessment } from "./actions";

type ProgramFeatures = {
  assessment_enabled: boolean;
  pre_survey_id: string | null;
  post_survey_id: string | null;
  mid_survey_id: string | null;
};

const PROGRAM_LABELS: Record<string, string> = {
  catalyst: "Catalyst",
  atg:      "After the Game",
  forte:    "Forte / Upskill Bahamas",
  forge:    "Forge",
};

export function FeatureToggles({
  programs,
  featuresMap,
}: {
  programs: string[];
  featuresMap: Record<string, ProgramFeatures>;
}) {
  return (
    <div className="space-y-4">
      {programs.map((slug) => (
        <ProgramCard
          key={slug}
          slug={slug}
          label={PROGRAM_LABELS[slug] ?? slug}
          features={featuresMap[slug]}
        />
      ))}
    </div>
  );
}

function ProgramCard({
  slug,
  label,
  features,
}: {
  slug: string;
  label: string;
  features: ProgramFeatures;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-ink/10 bg-ink/[0.02]">
        <h2 className="text-sm font-semibold text-ink">{label}</h2>
      </div>
      <div className="px-5 py-4 space-y-3">
        <ToggleRow
          label="Pathway Assessment"
          description="Show the 3-module learner pathway assessment in the onboarding flow"
          enabled={features.assessment_enabled}
          onToggle={(val) => toggleAssessment(slug, val)}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (val: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  const handleChange = () => {
    startTransition(async () => {
      await onToggle(!enabled);
    });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink/50 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={handleChange}
        disabled={isPending}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
          disabled:opacity-50
          ${enabled ? "bg-accent" : "bg-ink/20"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
            transition-transform duration-200
            ${enabled ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
