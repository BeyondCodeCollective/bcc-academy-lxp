import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  process: vi.fn(),
  rl: vi.fn(),
}));

vi.mock("@/lib/eventbrite-funnel", () => ({ processEventbriteOrder: mocks.process }));
vi.mock("@/lib/eventbrite", () => ({
  orderIdFromApiUrl: (u?: string) => /orders\/(\d+)/.exec(u ?? "")?.[1] ?? null,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rl,
  getClientIp: () => "1.2.3.4",
}));

import { POST } from "./route";

const body = { api_url: "https://www.eventbriteapi.com/v3/orders/777/", config: { action: "order.placed" } };

function req(opts: { qs?: string; headers?: Record<string, string>; json?: unknown; raw?: string } = {}) {
  return new NextRequest(`https://bccacademy.io/api/eventbrite/webhook${opts.qs ?? ""}`, {
    method: "POST",
    headers: { host: "bccacademy.io", ...(opts.headers ?? {}) },
    body: opts.raw ?? JSON.stringify(opts.json ?? body),
  });
}

beforeEach(() => {
  mocks.process.mockReset().mockResolvedValue({ ok: true });
  mocks.rl.mockReset().mockReturnValue({ ok: true, retryAfter: 0 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe("eventbrite webhook auth", () => {

  it("rejects a missing or wrong secret with 401 and does no work", async () => {
    vi.stubEnv("EVENTBRITE_WEBHOOK_SECRET", "s3cret");
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req({ qs: "?key=nope" }))).status).toBe(401);
    expect((await POST(req({ qs: "?key=s3cret1" }))).status).toBe(401);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("accepts the secret via ?key= or x-webhook-secret", async () => {
    vi.stubEnv("EVENTBRITE_WEBHOOK_SECRET", "s3cret");
    expect((await POST(req({ qs: "?key=s3cret" }))).status).toBe(200);
    expect((await POST(req({ headers: { "x-webhook-secret": "s3cret" } }))).status).toBe(200);
    expect(mocks.process).toHaveBeenCalledTimes(2);
  });

  it("returns 429 with Retry-After when rate limited, before touching anything", async () => {
    mocks.rl.mockReturnValue({ ok: false, retryAfter: 42 });
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(mocks.process).not.toHaveBeenCalled();
  });
});

describe("eventbrite webhook payload handling", () => {
  beforeEach(() => vi.stubEnv("EVENTBRITE_WEBHOOK_SECRET", ""));

  it("ignores non order.placed actions", async () => {
    const res = await POST(req({ json: { ...body, config: { action: "order.refunded" } } }));
    expect(res.status).toBe(200);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns 200 on malformed JSON so Eventbrite does not retry-storm", async () => {
    const res = await POST(req({ raw: "{not json" }));
    expect(res.status).toBe(200);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns 200 when the payload has no order id", async () => {
    const res = await POST(req({ json: { config: { action: "order.placed" }, api_url: "https://x/y" } }));
    expect(res.status).toBe(200);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns 200 even when processing fails, and uses forwarded host for origin", async () => {
    mocks.process.mockResolvedValue({ ok: false, error: "unmapped event" });
    const res = await POST(req({ headers: { "x-forwarded-host": "bccacademy.io", "x-forwarded-proto": "https" } }));
    expect(res.status).toBe(200);
    expect(mocks.process).toHaveBeenCalledWith("777", "https://bccacademy.io");
  });

  it("passes a repeated order id through (idempotency lives in processEventbriteOrder)", async () => {
    await POST(req());
    await POST(req());
    expect(mocks.process).toHaveBeenCalledTimes(2);
    expect(mocks.process.mock.calls[0]).toEqual(mocks.process.mock.calls[1]);
  });
});
