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

const twoSessions = {
  ...week,
  sessions: [{ title: "Mon" }, { title: "Thu" }],
} as unknown as WeekConfig;

describe("resolveSessionContent homework instructions", () => {
  it("is empty per session when there is no DB row", () => {
    expect(resolveSessionContent(twoSessions, null).homeworkInstructions).toEqual(["", ""]);
  });

  it("returns each session's own text", () => {
    const row = {
      homework_instructions: "Upload your three hand-written lines here",
      homework_instructions_2: "Bring a draft Thursday",
    } as SessionContentRow;
    expect(resolveSessionContent(twoSessions, row).homeworkInstructions).toEqual([
      "Upload your three hand-written lines here",
      "Bring a draft Thursday",
    ]);
  });

  it("treats null columns as empty", () => {
    const row = { homework_instructions: null, homework_instructions_2: null } as SessionContentRow;
    expect(resolveSessionContent(twoSessions, row).homeworkInstructions).toEqual(["", ""]);
  });
});
