import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { createWithdrawToken, verifyWithdrawToken } from "./withdraw-token";

const SECRET = "s".repeat(40);
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const sig = (payload: string, secret = SECRET) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
  process.env.WITHDRAW_SECRET = SECRET;
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.WITHDRAW_SECRET;
  vi.unstubAllEnvs();
});

describe("withdraw token", () => {
  it("round-trips and normalizes the email", () => {
    const t = createWithdrawToken("  Kid@Example.TEST ");
    expect(verifyWithdrawToken(t)).toEqual({ ok: true, email: "kid@example.test" });
  });

  it("expires after the ttl", () => {
    const t = createWithdrawToken("kid@example.test", 60);
    vi.setSystemTime(new Date("2026-11-12T12:00:59Z"));
    expect(verifyWithdrawToken(t).ok).toBe(true);
    vi.setSystemTime(new Date("2026-11-12T12:01:02Z"));
    const r = verifyWithdrawToken(t);
    expect(r.ok).toBe(false);
  });

  it("rejects a tampered email with the original signature", () => {
    const t = createWithdrawToken("kid@example.test");
    const [, exp, s] = Buffer.from(t, "base64url").toString().split(":");
    const forged = b64(`victim@example.test:${exp}:${s}`);
    expect(verifyWithdrawToken(forged)).toEqual({ ok: false, reason: "Invalid token." });
  });

  it("rejects an extended expiry", () => {
    const t = createWithdrawToken("kid@example.test", 60);
    const [email, , s] = Buffer.from(t, "base64url").toString().split(":");
    const forged = b64(`${email}:${Math.floor(Date.now() / 1000) + 99999}:${s}`);
    expect(verifyWithdrawToken(forged).ok).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const p = `kid@example.test:${exp}`;
    expect(verifyWithdrawToken(b64(`${p}:${sig(p, "z".repeat(40))}`)).ok).toBe(false);
  });

  it("accepts a hand-built valid token (format is stable)", () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const p = `kid@example.test:${exp}`;
    expect(verifyWithdrawToken(b64(`${p}:${sig(p)}`))).toEqual({ ok: true, email: "kid@example.test" });
  });

  it("rejects wrong-length and empty signatures without throwing", () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const p = `kid@example.test:${exp}`;
    expect(verifyWithdrawToken(b64(`${p}:abc`))).toEqual({ ok: false, reason: "Invalid token." });
    expect(verifyWithdrawToken(b64(`${p}:`)).ok).toBe(false);
    expect(verifyWithdrawToken(b64(`${p}:${sig(p)}${sig(p)}`)).ok).toBe(false);
  });

  it("rejects malformed shapes", () => {
    expect(verifyWithdrawToken("").ok).toBe(false);
    expect(verifyWithdrawToken("not a token!!").ok).toBe(false);
    expect(verifyWithdrawToken(b64("a:b")).ok).toBe(false);
    expect(verifyWithdrawToken(b64("a:b:c:d")).ok).toBe(false);
    expect(verifyWithdrawToken(b64("a:notanumber:c"))).toEqual({ ok: false, reason: "Malformed token." });
  });

  it("throws when no secret is configured at all", () => {
    delete process.env.WITHDRAW_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => createWithdrawToken("a@b.test")).toThrow(/not configured/);
  });

  it("refuses the derived fallback secret in production", () => {
    delete process.env.WITHDRAW_SECRET;
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => createWithdrawToken("a@b.test")).toThrow(/WITHDRAW_SECRET must be set/);
  });

  it("ignores a short WITHDRAW_SECRET and falls back (dev only)", () => {
    process.env.WITHDRAW_SECRET = "short";
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = createWithdrawToken("a@b.test");
    expect(verifyWithdrawToken(t).ok).toBe(true);
  });
});
