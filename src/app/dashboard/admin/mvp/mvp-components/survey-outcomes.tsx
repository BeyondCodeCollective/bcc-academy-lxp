import type { MvpDashboardData } from "@/lib/mvp/types";

// Only aggregate outcomes cross into this component, never learner answers.
type SurveyOutcomesProps = Pick<MvpDashboardData, "programs" | "surveyOutcomes">;

// A fixed locale keeps server/client formatting consistent. Zero is a result;
// unavailable values remain visibly distinct from no measured change.
function value(number: number | null, signed = false): string {
  if (number === null || !Number.isFinite(number)) return "Not available";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2, signDisplay: signed ? "exceptZero" : "auto",
  }).format(number);
}

export function SurveyOutcomes({ programs, surveyOutcomes }: SurveyOutcomesProps) {
  const findRow = (group: NonNullable<MvpDashboardData["surveyOutcomes"]>[number]) =>
    programs.find((row) => group.scope === "program" ? row.programId === group.programId : row.id === group.programRowId);
  const visibleGroups = surveyOutcomes?.filter((group) => findRow(group)) ?? [];
  return (
    <section aria-labelledby="mvp-survey-outcomes" className="mt-8 space-y-4">
      <header>
        <h2 id="mvp-survey-outcomes" className="text-xl font-semibold text-ink">Survey outcomes</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Learners’ self-reported before-and-now ratings, separated by program and course.
          Both averages use the same paired respondents’ latest completed survey.
          These ratings do not establish that the program caused a change.
        </p>
      </header>

      {!visibleGroups.length && (
        <p className="text-sm text-ink-soft">No survey outcome results are available for this selection.</p>
      )}
      {visibleGroups.map((group) => {
        const program = findRow(group);
        if (!program) return null;
        return (
          <details key={group.programRowId} className="rounded-xl border border-rule bg-white p-5">
            <summary className="cursor-pointer font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              {program.programName} · {group.scope === "program" ? "Program-wide survey outcomes" : program.courseName ?? "Course"}
              <span className="ml-2 text-sm font-normal text-ink-soft">
                {group.measures.length ? `${group.measures.length} measures — view results` : "Results unavailable"}
              </span>
            </summary>
            {group.unavailableReason && <p className="mt-3 text-sm text-ink-soft">{group.unavailableReason}</p>}
            {group.measures.length > 0 && (
              <div className="mt-4 overflow-x-auto" role="region" aria-label={`${program.courseName ?? "Course"} survey measures`} tabIndex={0}>
                <table className="w-full text-left text-sm">
                  <caption className="mb-3 text-left text-xs text-ink-soft">
                    Respondents answered at least one side; paired respondents answered both. Missing pairs show “Not available.”
                  </caption>
                  <thead><tr className="border-b border-rule">
                    {["Measure / source", "Before", "Now", "Change (points)", "Respondents", "Paired respondents"].map((label) => (
                      <th key={label} scope="col" className="px-3 py-2 font-semibold text-ink">{label}</th>
                    ))}
                  </tr></thead>
                  <tbody>{group.measures.map((measure) => (
                    <tr key={measure.id} className="border-b border-rule align-top">
                      <th scope="row" className="min-w-56 px-3 py-3 font-normal text-ink">
                        <p className="font-medium">{measure.label}</p>
                        <p className="mt-1 text-xs text-ink-soft">{measure.sourceLabel} · {measure.unit}</p>
                      </th>
                      {[value(measure.beforeValue), value(measure.afterValue), value(measure.change, true),
                        value(measure.respondentCount), value(measure.pairedRespondentCount)].map((display, index) => (
                        <td key={index} className="px-3 py-3 tabular-nums text-ink">{display}</td>
                      ))}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </details>
        );
      })}
    </section>
  );
}
