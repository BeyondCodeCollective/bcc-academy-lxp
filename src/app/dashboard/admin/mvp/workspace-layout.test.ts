import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceLayout } from "./mvp-components/workspace-layout";

describe("MVP workspace layout", () => {
  it("places the section navigation above the content", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLayout, { navigation: "Navigation" }, "Content"));
    expect(html.indexOf("Navigation")).toBeLessThan(html.indexOf("Content"));
    expect(html).not.toContain('role="separator"');
  });
});
