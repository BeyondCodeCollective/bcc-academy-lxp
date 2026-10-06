import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import type { SurveyConfig } from "@/lib/programs/types";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { calculateMvpSurveyOutcomes, type MvpSurveySubmission } from "./survey-outcomes";
import type { MvpOutcomeMeasure } from "./types";

// Each result belongs to one already-authorized course row. Missing mapping
// is distinct from a mapped survey with no completed learner responses.
export type MvpSurveyOutcomeGroup = {
  programRowId: string;
  programId?: string;
  scope?: "program" | "course";
  measures: MvpOutcomeMeasure[];
  unavailableReason: string | null;
};

export async function loadMvpSurveyOutcomes(
  db: ReturnType<typeof createServiceClient>,
  scope: { programRowId: string; programId: string; programSlug: string;
    courseSlug: string | null; learnerIds: string[]; surveys: SurveyConfig[] },
): Promise<MvpSurveyOutcomeGroup> {
  // Require explicit course attribution: roster membership alone does not
  // prove a learner answered a general program survey about this course.
  const surveys = scope.surveys.filter((survey) =>
    (scope.courseSlug === null
      ? !survey.appliesToTracks?.length && !survey.skipForTracks?.length
      : survey.appliesToTracks?.includes(scope.courseSlug) && !survey.skipForTracks?.includes(scope.courseSlug)) &&
    !survey.skipForPrograms?.includes(scope.programSlug) &&
    (!survey.appliesToPrograms || survey.appliesToPrograms.includes(scope.programSlug)));
  const measures: MvpOutcomeMeasure[] = [];
  for (const survey of surveys) {
    const questions = (getSurveySchema(survey.id) ?? []).filter((question) => question.type === "dual-likert");
    if (!questions.length) continue;
    const submissions: MvpSurveySubmission[] = [];
    // Bound roster requests and paginate until empty, including when the
    // database's response cap is lower than our requested page size.
    for (let offset = 0; offset < scope.learnerIds.length; offset += 100) {
      let cursor: string | null = null;
      while (true) {
        let query = db.from("survey_responses")
          .select("id, student_id, completed_at, responses")
          .eq("program_id", scope.programId).eq("survey_type", survey.id)
          .in("student_id", scope.learnerIds.slice(offset, offset + 100))
          .order("id", { ascending: true }).limit(500);
        if (cursor !== null) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error) throw new Error("Unable to load complete MVP survey outcomes.");
        if (!data?.length) break;
        for (const row of data) submissions.push({ id: row.id, studentId: row.student_id,
          completedAt: row.completed_at, responses: row.responses ?? {} });
        const next: string = data[data.length - 1].id;
        if (cursor !== null && next <= cursor) throw new Error("MVP survey pagination did not advance.");
        cursor = next;
      }
    }
    measures.push(...calculateMvpSurveyOutcomes(survey.id, survey.title, questions, submissions));
  }
  return { programRowId: scope.programRowId, programId: scope.programId,
    scope: scope.courseSlug === null ? "program" : "course", measures,
    unavailableReason: !measures.length
      ? scope.courseSlug === null
        ? "No supported program-wide retrospective survey is configured. Surveys restricted to particular courses are excluded."
        : "No explicitly course-mapped retrospective survey with a supported numeric scale. General program, anonymous public, and separate pre/post surveys are not attributed to this course."
      : measures.every((measure) => measure.pairedRespondentCount === 0)
        ? "No valid paired responses from eligible current learners in this program/course scope." : null };
}
