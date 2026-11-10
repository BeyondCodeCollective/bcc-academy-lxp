import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadOnboardingChecklist,
  getEnforcedOnboardingChecklist,
  customFormSurveyType,
  type ChecklistConfig,
} from "@/lib/onboarding/checklists";

// A stand-in for the one query loadOnboardingChecklist makes.
function fakeSvc(config: ChecklistConfig | null): SupabaseClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: config ? { config } : null }),
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

const saved: ChecklistConfig = {
  cohort: "BGC Spring",
  title: "Saved by an admin",
  intro: "",
  agreement: { version: "v1", timeCommitment: "" },
  items: [
    {
      id: "form-1",
      label: "Waiver",
      description: "",
      kind: "form",
      surveyType: customFormSurveyType("bgc-spring", "form-1"),
    },
  ],
};

describe("loadOnboardingChecklist", () => {
  it("prefers the saved checklist over the built-in one", async () => {
    const c = await loadOnboardingChecklist(fakeSvc(saved), "mass-fall-2026");
    expect(c?.title).toBe("Saved by an admin");
    expect(c?.trackSlug).toBe("mass-fall-2026");
  });

  it("falls back to the built-in checklist when nothing is saved", async () => {
    const c = await loadOnboardingChecklist(fakeSvc(null), "mass-fall-2026");
    expect(c?.items.map((i) => i.id)).toEqual(["intake", "agreement", "presurvey"]);
  });

  it("returns null for a course with neither", async () => {
    expect(await loadOnboardingChecklist(fakeSvc(null), "no-such-course")).toBeNull();
  });
});

describe("getEnforcedOnboardingChecklist", () => {
  it("does not enforce a paused saved checklist", async () => {
    expect(await getEnforcedOnboardingChecklist(fakeSvc({ ...saved, paused: true }), "x")).toBeNull();
  });

  it("enforces an active saved checklist", async () => {
    expect((await getEnforcedOnboardingChecklist(fakeSvc(saved), "x"))?.title).toBe("Saved by an admin");
  });
});

describe("customFormSurveyType", () => {
  it("is stable per course and step", () => {
    expect(customFormSurveyType("bgc-spring", "form-1")).toBe("custom:bgc-spring:form-1");
  });
});
