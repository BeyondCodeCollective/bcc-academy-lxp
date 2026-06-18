import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import type { ScoredOutput } from "@/lib/assessment/types";
import {
  ARCHETYPE_CONTENT,
  WORK_STYLE_CONTENT,
  PATHWAY_CONTENT,
} from "@/lib/assessment/content";
import { PageHeader } from "@/components/page-header";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canAccessAdminPanel(ctx.student?.role ?? "")) redirect("/dashboard");

  const svc = createServiceClient();

  const { data: result } = await svc
    .from("assessment_results")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!result) redirect("/dashboard/admin/assessments");

  // Mark as viewed
  if (!result.facilitator_viewed_at) {
    await svc
      .from("assessment_results")
      .update({ facilitator_viewed_at: new Date().toISOString() })
      .eq("student_id", studentId);
  }

  const { data: student } = await svc
    .from("students")
    .select("first_name, last_name, email")
    .eq("id", studentId)
    .maybeSingle();

  const scored = result.scored_output as ScoredOutput;
  const archetype = ARCHETYPE_CONTENT[scored.archetype_primary];
  const secondary = scored.archetype_secondary
    ? ARCHETYPE_CONTENT[scored.archetype_secondary]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 space-y-8">
      <PageHeader
        title={student ? `${student.first_name} ${student.last_name}` : "Student"}
        subtitle={student?.email}
      />

      {/* Module 1 — Archetype */}
      <FacilitatorSection title="Module 1 — Archetype Identity">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-ink">{archetype.name}</span>
            <ConfidenceBadge confidence={scored.archetype_confidence} />
            {scored.facilitator_review && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">
                Review recommended
              </span>
            )}
          </div>
          {scored.archetype_is_blended && secondary && (
            <p className="text-sm text-ink/60">Blended with: <strong>{secondary.name}</strong></p>
          )}
          <p className="text-sm text-ink/70 leading-relaxed">{archetype.facilitator}</p>
          {secondary && scored.archetype_is_blended && (
            <p className="text-sm text-ink/70 leading-relaxed mt-2">{secondary.facilitator}</p>
          )}

          {/* Score table */}
          <details className="mt-3">
            <summary className="text-xs text-ink/40 cursor-pointer hover:text-ink/60 transition-colors">
              Show score breakdown
            </summary>
            <div className="mt-2 space-y-1">
              {(Object.entries(scored.archetype_scores) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([key, avg]) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="w-36 text-ink/60 capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex-1 bg-ink/5 rounded-full h-1.5">
                      <div
                        className="bg-accent rounded-full h-1.5 transition-all"
                        style={{ width: `${((avg - 1) / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-ink/40 w-8 text-right">{avg.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </details>
        </div>
      </FacilitatorSection>

      {/* Module 2 — Work Style */}
      <FacilitatorSection title="Module 2 — Work Style">
        <div className="space-y-4">
          {[
            { label: "Social energy", pole: scored.social_energy, signal: scored.social_energy_signal },
            { label: "Structure", pole: scored.structure_preference, signal: scored.structure_preference_signal },
            { label: "Contribution", pole: scored.contribution_mode, signal: scored.contribution_mode_signal },
            { label: "Pace", pole: scored.pace, signal: scored.pace_signal },
          ].map(({ label, pole, signal }) => {
            const content = WORK_STYLE_CONTENT[pole];
            const poleName = pole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</span>
                  <span className="text-xs font-medium text-accent">{poleName}</span>
                  <span className="text-[10px] text-ink/30">{signal === "clear" ? "3–0" : "2–1"}</span>
                </div>
                <p className="text-sm text-ink/70 leading-relaxed">{content.facilitator}</p>
              </div>
            );
          })}
          {scored.sustainability_risk && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Sustainability flag</p>
              <p className="text-xs text-amber-700">Two or more work-style dimensions may create strain in a fast, unstructured track. Plan support before placement confirmation.</p>
            </div>
          )}
        </div>
      </FacilitatorSection>

      {/* Module 3 — Motivation */}
      <FacilitatorSection title="Module 3 — Motivation and Pathway">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Self-direction", value: scored.self_direction_avg },
              { label: "Stability-seeking", value: scored.stability_seeking_avg },
              { label: "Risk comfort", value: scored.risk_comfort_avg },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-ink/10 px-3 py-3 text-center">
                <p className="text-lg font-bold text-ink">{value.toFixed(2)}</p>
                <p className="text-[10px] text-ink/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-1">Pathway orientation</p>
            <p className="font-medium text-ink capitalize mb-1">{scored.pathway_orientation}</p>
            <p className="text-sm text-ink/70 leading-relaxed">{PATHWAY_CONTENT[scored.pathway_orientation].facilitator}</p>
          </div>
          {scored.sustainability_note && (
            <div className="rounded-lg bg-ink/5 px-4 py-3">
              <p className="text-xs text-ink/50 leading-relaxed">High self-direction with lower risk comfort — this learner wants to build but may strain under sustained uncertainty. Plan scaffolding and a staged path.</p>
            </div>
          )}
        </div>
      </FacilitatorSection>
    </div>
  );
}

function FacilitatorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-ink/10 bg-ink/[0.02]">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ScoredOutput["archetype_confidence"] }) {
  const labels: Record<string, string> = {
    high: "High confidence",
    moderate: "Moderate confidence",
    blended: "Blended",
    low: "Low confidence",
    broad_high: "Broad high",
    flat: "Flat pattern",
  };
  const colors: Record<string, string> = {
    high: "bg-green-100 text-green-800",
    moderate: "bg-blue-100 text-blue-800",
    blended: "bg-purple-100 text-purple-800",
    low: "bg-amber-100 text-amber-800",
    broad_high: "bg-amber-100 text-amber-800",
    flat: "bg-ink/10 text-ink/60",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}
