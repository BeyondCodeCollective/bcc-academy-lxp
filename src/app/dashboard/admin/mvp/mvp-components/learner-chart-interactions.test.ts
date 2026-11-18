import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearnerCharts } from "./learner-charts";

// Exercise actual chart handlers and successive renders without a browser or
// database. Only hook storage is replaced; privacy guards remain real.
const hooks = vi.hoisted(() => ({ selection: null as unknown }));
vi.mock("react", async importOriginal => ({ ...await importOriginal<typeof import("react")>(),
  useId: () => "chart-test",
  useState: () => [hooks.selection, (next: unknown) => { hooks.selection = next; }],
}));
beforeEach(() => { hooks.selection = null; });
type Props = Parameters<typeof LearnerCharts>[0];
const safe: Props = {
  attendance: { state: "ready", rows: [{ id: "session", label: "Old session", eligible: 10, present: 5, absent: 5, unrecorded: 0 }] },
  milestones: { state: "ready", rows: [{ id: "week", label: "Old week", eligible: 10, submissions: 5, reflections: 0, markedWatched: 10 }] },
};
function buttons(node: ReactNode): { children?: ReactNode; onClick: () => void; title?: string }[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<{ children?: ReactNode; onClick: () => void; title?: string }>(node)) return [];
  return [...(node.type === "button" ? [node.props] : []), ...buttons(node.props.children)];
}
describe("Chart selection privacy", () => {
  it.each(["segment", "table"])("clears a safe %s selection from the display when the dataset becomes suppressed", surface => {
    const targets = buttons(LearnerCharts(safe));
    const target = targets.find(button => surface === "segment" ? !!button.title : button.children === 5)!;
    expect(target).toBeDefined();
    target.onClick();
    expect(renderToStaticMarkup(LearnerCharts(safe))).toContain("Clear chart selection");
    const next: Props = { attendance: { state: "suppressed" }, milestones: { state: "suppressed" } };
    const tree = LearnerCharts(next);
    expect(buttons(tree)).toHaveLength(0);
    const html = renderToStaticMarkup(tree);
    for (const hidden of ["Old session", "Old week", "Clear chart selection", "<table", "<title", "title="]) expect(html).not.toContain(hidden);
  });
  it("removes a milestone selection on changed data, unavailable data, and explicit clear", () => {
    const targets = buttons(LearnerCharts(safe));
    targets[targets.length - 1].onClick();
    expect(renderToStaticMarkup(LearnerCharts(safe))).toContain("Old week · Marked watched: 10 learners.");
    const changed: Props = { ...safe, milestones: { state: "ready", rows: [
      { id: "new-week", label: "New week", eligible: 10, submissions: 0, reflections: 5, markedWatched: 5 },
    ] } };
    expect(renderToStaticMarkup(LearnerCharts(changed))).not.toContain("Clear chart selection");
    expect(renderToStaticMarkup(LearnerCharts({}))).not.toContain("Old week");
    const original = LearnerCharts(safe);
    buttons(original).find(button => button.children === "Clear chart selection")!.onClick();
    expect(renderToStaticMarkup(LearnerCharts(safe))).not.toContain("Clear chart selection");
  });
});
