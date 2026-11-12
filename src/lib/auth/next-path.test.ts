import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("allows dashboard paths, including query and hyphens", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/dashboard/track/comptia-security")).toBe("/dashboard/track/comptia-security");
    expect(safeNextPath("/dashboard/x?a=1&b=2#frag")).toBe("/dashboard/x?a=1&b=2#frag");
  });

  it("returns null for empty input", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it.each([
    "//evil.test",
    "//evil.test/dashboard",
    "/\\evil.test",
    "/\\/evil.test",
    "https://evil.test",
    "https://evil.test/dashboard",
    "http://localhost/dashboard",
    "javascript:alert(1)",
    "data:text/html,x",
    "dashboard",
    "/",
    "/admin",
    "/login",
    " /dashboard",
    "\t/dashboard",
    "/dashboard\r\nSet-Cookie: a=b",
    "/dashboard\nLocation: https://evil.test",
    "/dashboard x",
    "/dashboard\u0000",
    "/dashboard\u007f",
  ])("rejects %j", (bad) => {
    expect(safeNextPath(bad)).toBeNull();
  });
});
