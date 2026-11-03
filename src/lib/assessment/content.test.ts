import { describe, expect, it } from "vitest";
import { ARCHETYPE_CONTENT } from "./content";

// Angel's v4 copy for the three archetypes that had no pathways yet.
describe("v4 archetype copy", () => {
  it.each([
    ["igniter", "You tend to get things started and move ideas into action.", ["Prototyping", "AI Automations"]],
    ["culture_keeper", "You tend to notice how a group is doing and help people feel included.", ["AI Fundamentals", "IT + Help Desk"]],
    ["explorer", "You tend to learn by trying things and keeping your options open.", ["AI Fundamentals", "Virtual Labs"]],
  ] as const)("%s has the new tagline, pathways and verticals", (key, tagline, verticals) => {
    const c = ARCHETYPE_CONTENT[key];
    expect(c.definition).toBe(tagline);
    expect(c.pathwaysIntro).toBeTruthy();
    expect(c.pathways?.entry).toBeTruthy();
    expect(c.pathways?.mid).toBeTruthy();
    expect(c.pathways?.established).toBeTruthy();
    expect(c.verticals).toEqual(verticals);
  });
});
