import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ journeys: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/sentinel/journeys", () => ({ runJourneyChecks: mocks.journeys }));
vi.mock("@/lib/email", () => ({ sendSentinelReportEmail: mocks.email }));

import { GET, POST } from "./route";

const url = (qs = "") => `https://bccacademy.io/api/hooks/deploy-check${qs}`;
const ok = { name: "home", url: "/", ok: true, status: 200 };
const bad = { name: "login", url: "/login", ok: false, status: 500 };

beforeEach(() => {
  mocks.journeys.mockReset().mockResolvedValue([ok]);
  mocks.email.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("deploy-check hook", () => {
  it("401s with a wrong or missing secret and runs no probes", async () => {
    vi.stubEnv("CRON_SECRET", "abc");
    expect((await GET(new Request(url()))).status).toBe(401);
    expect((await GET(new Request(url("?secret=x")))).status).toBe(401);
    expect((await POST(new Request(url(), { method: "POST", headers: { authorization: "Bearer x" } }))).status).toBe(401);
    expect(mocks.journeys).not.toHaveBeenCalled();
  });

  it("accepts ?secret= or the bearer header", async () => {
    vi.stubEnv("CRON_SECRET", "abc");
    expect((await GET(new Request(url("?secret=abc")))).status).toBe(200);
    expect((await GET(new Request(url(), { headers: { authorization: "Bearer abc" } }))).status).toBe(200);
  });


  it("is silent on a clean run", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const body = await (await GET(new Request(url()))).json();
    expect(body.ok).toBe(true);
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it("emails only the failing journeys", async () => {
    vi.stubEnv("CRON_SECRET", "");
    mocks.journeys.mockResolvedValue([ok, bad]);
    const body = await (await GET(new Request(url()))).json();
    expect(body.ok).toBe(false);
    expect(mocks.email).toHaveBeenCalledTimes(1);
    const arg = mocks.email.mock.calls[0][0];
    expect(arg.brief).toContain("1 of 2");
    expect(arg.findings).toHaveLength(1);
    expect(arg.findings[0].message).toContain("/login");
  });
});
