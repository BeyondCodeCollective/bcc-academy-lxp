import { existsSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../../../../next.config";
import { AdminTopTabs } from "../admin-top-tabs";

vi.mock("@/components/link-pending", () => ({ LinkPending: () => null }));
vi.mock("@/components/ui", () => ({ SegmentedTabs: () => null }));

afterEach(() => vi.unstubAllEnvs());

describe("MVP shared integrations", () => {
  it("includes both local PDF fonts in the export server trace", () => {
    const fonts = config.outputFileTracingIncludes?.["/api/mvp/export"];
    expect(fonts).toEqual([
      "./public/fonts/patika/Patika-Regular.otf",
      "./public/fonts/patika/Patika-Bold.otf",
    ]);
    for (const font of fonts ?? []) expect(existsSync(path.resolve(font))).toBe(true);
    expect(config.outputFileTracingIncludes?.["/platform-atlas"]).toEqual(["./src/app/platform-atlas/atlas.html"]);
  });

  it("shows the active MVP tab to managers in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = renderToStaticMarkup(createElement(AdminTopTabs, { current: "mvp", showInsights: true, isManager: true }));
    expect(html).toContain("MVP Dashboard");
    expect(html).toContain('href="/dashboard/admin/mvp"');
    expect(html).toContain('aria-current="page"');
  });

  it("does not expose the preview tab in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const html = renderToStaticMarkup(createElement(AdminTopTabs, { current: "courses", showInsights: true, isManager: true }));
    expect(html).not.toContain("MVP Dashboard");
    expect(html).toContain("People");
  });

  it("preserves course-only navigation for non-managers", () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = renderToStaticMarkup(createElement(AdminTopTabs, { current: "courses", showInsights: false, isManager: false }));
    expect(html).toContain("Courses");
    expect(html).not.toContain("MVP Dashboard");
    expect(html).not.toContain("People");
  });
});
