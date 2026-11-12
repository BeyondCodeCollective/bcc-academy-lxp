import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: {} as Record<string, string> }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(mocks.headers) }));

import { getLinkOrigin } from "./link-origin";

beforeEach(() => {
  mocks.headers = {};
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("getLinkOrigin", () => {
  it("returns a production host over https", async () => {
    mocks.headers = { host: "www.bccacademy.io" };
    expect(await getLinkOrigin()).toBe("https://www.bccacademy.io");
  });

  it("prefers x-forwarded-host over host", async () => {
    mocks.headers = { host: "internal:3000", "x-forwarded-host": "bccacademy.io" };
    expect(await getLinkOrigin()).toBe("https://bccacademy.io");
  });

  it("keeps localhost and its port outside production", async () => {
    mocks.headers = { host: "localhost:3000" };
    expect(await getLinkOrigin()).toBe("http://localhost:3000");
  });

  it("keeps this deployment's preview hosts", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "learning-portal-abc123.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "learning-portal-git-branch.vercel.app");
    mocks.headers = { host: "learning-portal-abc123.vercel.app" };
    expect(await getLinkOrigin()).toBe("https://learning-portal-abc123.vercel.app");
    mocks.headers = { host: "learning-portal-git-branch.vercel.app" };
    expect(await getLinkOrigin()).toBe("https://learning-portal-git-branch.vercel.app");
  });

  it("falls back to the canonical origin for any other host", async () => {
    mocks.headers = { host: "other.example.test" };
    expect(await getLinkOrigin()).toBe("https://bccacademy.io");
    mocks.headers = { host: "other-project.vercel.app" };
    expect(await getLinkOrigin()).toBe("https://bccacademy.io");
    mocks.headers = {};
    expect(await getLinkOrigin()).toBe("https://bccacademy.io");
  });

  it("does not keep localhost in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    mocks.headers = { host: "localhost:3000" };
    expect(await getLinkOrigin()).toBe("https://bccacademy.io");
  });
});
