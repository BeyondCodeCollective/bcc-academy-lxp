import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceLayout, clampWorkspaceWidth, workspaceKeyboardWidth } from "./mvp-components/workspace-layout";

describe("resizable MVP workspace", () => {
  it("bounds pointer widths so neither pane can be collapsed", () => {
    expect(clampWorkspaceWidth(-100)).toBe(240);
    expect(clampWorkspaceWidth(290)).toBe(290);
    expect(clampWorkspaceWidth(2000)).toBe(360);
  });
  it("supports keyboard resizing and leaves unrelated keys alone", () => {
    expect(workspaceKeyboardWidth(260, "ArrowLeft")).toBe(250);
    expect(workspaceKeyboardWidth(260, "ArrowRight")).toBe(270);
    expect(workspaceKeyboardWidth(240, "ArrowLeft")).toBe(240);
    expect(workspaceKeyboardWidth(360, "ArrowRight")).toBe(360);
    expect(workspaceKeyboardWidth(260, "Home")).toBe(240);
    expect(workspaceKeyboardWidth(260, "End")).toBe(360);
    expect(workspaceKeyboardWidth(260, "Tab")).toBeNull();
  });
  it("exposes an accessible separator and stacks content on small screens", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLayout, { navigation: "Navigation" }, "Content"));
    for (const text of ['role="separator"', 'aria-orientation="vertical"', 'aria-valuenow="260"', 'tabindex="0"', "grid-cols-1", "lg:block", "--workspace-width:260px"]) expect(html).toContain(text);
    expect(html.indexOf("Navigation")).toBeLessThan(html.indexOf("Content"));
  });
});
