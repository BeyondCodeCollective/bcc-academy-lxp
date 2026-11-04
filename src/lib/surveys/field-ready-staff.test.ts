import { describe, expect, it } from "vitest";
import { getSurveySchema } from "./schemas";
import { PLATFORM_AUTH_SURVEYS } from "./platform";
import { getSurveyPagesForTest } from "@/components/survey-wizard";

const PRE = "field-ready-staff-pre";
const POST = "field-ready-staff-post";
const ids = (id: string) => getSurveySchema(id)!.map((q) => q.id);

describe("field ready staff surveys", () => {
  it.each([PRE, POST])("%s is registered, coded, scoped to the cohort, with unique ids", (id) => {
    expect(new Set(ids(id)).size).toBe(ids(id).length);
    expect(PLATFORM_AUTH_SURVEYS[id]?.appliesToTracks).toEqual(["field-ready-staff-cohort"]);
    expect(PLATFORM_AUTH_SURVEYS[id]?.participantCoded).toBe(true);
    expect(PLATFORM_AUTH_SURVEYS[id]?.required).toBe(false);
  });

  it.each([PRE, POST])("%s wizard pages match the schema", (id) => {
    const pages = getSurveyPagesForTest(id, "field-ready");
    expect(pages.flatMap((p) => p.questions).map((q) => q.id)).toEqual(ids(id));
  });

  it("pre and post share the comparable ids and wording", () => {
    const shared = [
      "conf_explain_model", "conf_check_answer", "conf_set_up_tool", "conf_explain_work",
      "ai_use_frequency", "ai_tools_used", "ai_tools_plan",
      "kc_statistic_source", "kc_check_first_claim", "kc_sensitive_data",
    ];
    const pre = getSurveySchema(PRE)!;
    const post = getSurveySchema(POST)!;
    for (const id of shared) {
      const a = pre.find((q) => q.id === id);
      const b = post.find((q) => q.id === id);
      expect(a, id).toBeTruthy();
      expect(b, id).toBeTruthy();
      if (a?.type === "radio" && b?.type === "radio") expect(a.options).toEqual(b.options);
      if (a?.type === "likert" && b?.type === "likert") expect(a.statements).toEqual(b.statements);
    }
    expect(ids(POST)).toEqual(expect.arrayContaining(["retro_explain_model", "retro_check_answer"]));
  });

  it("requires recording consent and exposes no answer key", () => {
    const consent = getSurveySchema(PRE)!.find((q) => q.type === "consent");
    expect(consent?.required).toBe(true);
    expect(JSON.stringify(getSurveySchema(PRE))).not.toMatch(/correct/i);
  });
});
