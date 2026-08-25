import { describe, expect, it } from "vitest";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { PLATFORM_AUTH_SURVEYS } from "@/lib/surveys/platform";
import { getOnboardingChecklist } from "@/lib/onboarding/checklists";
import { getEveryProgramConfig } from "@/lib/programs";

// Every checklist a cohort is gated on. Listed explicitly so adding a cohort
// means adding it here — the point is that a checklist can't ship half-wired.
const GATED_TRACKS = ["comptia-security", "mass-fall-2026"];

const surveyConfigExists = (id: string) =>
  !!PLATFORM_AUTH_SURVEYS[id] ||
  getEveryProgramConfig().some((p) => (p.surveys ?? []).some((s) => s.id === id));

describe.each(GATED_TRACKS)("onboarding checklist: %s", (trackSlug) => {
  const checklist = getOnboardingChecklist(trackSlug)!;

  it("exists with an agreement item and a duration sentence", () => {
    expect(checklist).toBeTruthy();
    expect(checklist.items.some((i) => i.kind === "agreement")).toBe(true);
    expect(checklist.agreement.timeCommitment).toMatch(/weeks/);
    expect(checklist.agreement.version).toBeTruthy();
  });

  // hfs-pre-survey shipped as a checklist-shaped item with no questions behind
  // it and collected 22 responses under the wrong schema. Every survey item a
  // learner is BLOCKED on must resolve to a real survey with a real schema.
  it.each(checklist.items.filter((i) => i.kind === "survey"))(
    "survey item %o resolves to a registered survey and schema",
    (item) => {
      expect(item.href).toBe(`/dashboard/survey/${item.surveyType}`);
      expect(surveyConfigExists(item.surveyType)).toBe(true);
      expect(getSurveySchema(item.surveyType)?.length ?? 0).toBeGreaterThan(0);
    },
  );
});

// The wizard THROWS for an unwired survey id, so this is the check that the
// pre-survey a MASS learner is blocked on actually renders questions.
describe("survey wizard routing", () => {
  it("serves the MASS pre-survey its own pages", async () => {
    const { getSurveyPagesForTest } = await import("@/components/survey-wizard");
    const pages = getSurveyPagesForTest("mass-fall-2026-pre", "catalyst");
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.flatMap((p) => p.questions).map((q) => q.id)).toEqual(
      getSurveySchema("mass-fall-2026-pre")!.map((q) => q.id),
    );
  });
});
