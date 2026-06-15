"use client";

import { useState } from "react";
import type { ScoredOutput } from "@/lib/assessment/types";
import {
  ARCHETYPE_CONTENT,
  WORK_STYLE_CONTENT,
  PATHWAY_CONTENT,
  SPECIAL_CASE_LANGUAGE,
  SUSTAINABILITY_NOTE,
  MODULE_2_FRAMING,
  MODULE_3_FRAMING,
} from "@/lib/assessment/content";

export function ResultsProfile({ result }: { result: ScoredOutput }) {
  const [openSection, setOpenSection] = useState<string | null>("archetype");

  const archetypeContent = ARCHETYPE_CONTENT[result.archetype_primary];
  const secondaryContent = result.archetype_secondary
    ? ARCHETYPE_CONTENT[result.archetype_secondary]
    : null;

  const showArchetypeNarrative =
    result.archetype_confidence !== "low" &&
    result.archetype_confidence !== "flat" &&
    result.archetype_confidence !== "broad_high";

  const archetypeSummaryText = (() => {
    if (result.archetype_confidence === "low") return SPECIAL_CASE_LANGUAGE.low_confidence;
    if (result.archetype_confidence === "broad_high") return SPECIAL_CASE_LANGUAGE.broad_high;
    if (result.archetype_confidence === "flat") return SPECIAL_CASE_LANGUAGE.flat;
    if (result.archetype_is_blended && secondaryContent) {
      return `Your profile shows a blended pattern: ${archetypeContent.name} and ${secondaryContent.name}.`;
    }
    return archetypeContent.definition;
  })();

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Your Pathway Profile
        </p>
        <h1 className="text-4xl font-black text-ink leading-tight">
          {showArchetypeNarrative ? (
            <>{archetypeContent.emoji} {archetypeContent.name}</>
          ) : "Your Profile"}
        </h1>
        <p className="text-ink/70 leading-relaxed">{archetypeSummaryText}</p>
      </div>

      {/* Section 1 — How you show up */}
      <Section
        id="archetype"
        title="✨ How you show up"
        isOpen={openSection === "archetype"}
        onToggle={() => setOpenSection(openSection === "archetype" ? null : "archetype")}
      >
        {showArchetypeNarrative ? (
          <div className="space-y-4">
            <p className="text-ink/80 leading-relaxed">{archetypeContent.learner}</p>
            {result.archetype_is_blended && secondaryContent && (
              <>
                <hr className="border-ink/10" />
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                  {secondaryContent.name}
                </p>
                <p className="text-ink/80 leading-relaxed">{secondaryContent.learner}</p>
              </>
            )}
          </div>
        ) : (
          <p className="text-ink/70 leading-relaxed">{archetypeSummaryText}</p>
        )}
      </Section>

      {/* Section 2 — How you tend to work */}
      <Section
        id="workstyle"
        title="🔧 How you tend to work"
        isOpen={openSection === "workstyle"}
        onToggle={() => setOpenSection(openSection === "workstyle" ? null : "workstyle")}
      >
        <div className="space-y-6">
          <p className="text-xs text-ink/50 italic">{MODULE_2_FRAMING}</p>
          {[
            { label: "Energy", pole: result.social_energy, signal: result.social_energy_signal },
            { label: "Structure", pole: result.structure_preference, signal: result.structure_preference_signal },
            { label: "Contribution", pole: result.contribution_mode, signal: result.contribution_mode_signal },
            { label: "Pace", pole: result.pace, signal: result.pace_signal },
          ].map(({ label, pole, signal }) => {
            const content = WORK_STYLE_CONTENT[pole];
            const poleName = pole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</span>
                  <span className="text-xs text-accent font-medium">{poleName}</span>
                  {signal === "lighter" && (
                    <span className="text-[10px] text-ink/30 italic">lighter lean</span>
                  )}
                </div>
                <p className="text-sm text-ink/75 leading-relaxed">{content.learner}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Section 3 — What drives you */}
      <Section
        id="pathway"
        title="🎯 What drives you"
        isOpen={openSection === "pathway"}
        onToggle={() => setOpenSection(openSection === "pathway" ? null : "pathway")}
      >
        <div className="space-y-4">
          <p className="text-xs text-ink/50 italic">{MODULE_3_FRAMING}</p>
          <p className="text-ink/80 leading-relaxed">
            {PATHWAY_CONTENT[result.pathway_orientation].learner}
          </p>
          {result.sustainability_note && (
            <div className="rounded-lg bg-ink/5 px-4 py-4">
              <p className="text-sm text-ink/70 leading-relaxed">{SUSTAINABILITY_NOTE}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Closing */}
      <p className="text-xs text-ink/40 italic text-center pt-4">
        {SPECIAL_CASE_LANGUAGE.closing}
      </p>
    </div>
  );
}

function Section({
  id, title, isOpen, onToggle, children,
}: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink/[0.02] transition-colors"
      >
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-ink/30 text-sm">{isOpen ? "↑" : "↓"}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-6 pt-2 border-t border-ink/10">
          {children}
        </div>
      )}
    </div>
  );
}
