import { describe, expect, it } from "vitest";
import { resolveSessionContent } from "./session-content";
import type { WeekConfig } from "@/lib/programs/types";
import type { SessionContentRow } from "@/app/dashboard/admin/actions";

const week = {
  week: 1,
  title: "Week 1",
  icon: "book",
  subtitle: "",
  description: "",
  objectives: [],
  sessions: [{ title: "Live" }],
} as unknown as WeekConfig;

describe("resolveSessionContent homework instructions", () => {
  it("is empty when there is no DB row", () => {
    expect(resolveSessionContent(week, null).homeworkInstructions).toBe("");
  });

  it("passes the instructor-written text through", () => {
    const row = { homework_instructions: "Upload your three hand-written lines here" } as SessionContentRow;
    expect(resolveSessionContent(week, row).homeworkInstructions).toBe(
      "Upload your three hand-written lines here",
    );
  });

  it("is empty when the column is null", () => {
    const row = { homework_instructions: null } as SessionContentRow;
    expect(resolveSessionContent(week, row).homeworkInstructions).toBe("");
  });
});
