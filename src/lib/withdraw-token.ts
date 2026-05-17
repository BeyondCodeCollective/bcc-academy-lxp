import crypto from "node:crypto";

// HMAC-signed withdrawal token. Used to prove the holder of `email`
// authorized the deletion of their public_survey_responses. The token
// encodes `email:expiry` and a signature; verification recomputes the
// signature server-side. No DB row needed — the secret is the only
// state. Falls back to SUPABASE_SERVICE_ROLE_KEY-derived material in
// dev so tokens still work without an extra env var, but production
// MUST set WITHDRAW_SECRET to a long random string.

const ALGO = "sha256" as const;
const ENCODING = "base64url" as const;
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function getSecret(): string {
  const fromEnv = process.env.WITHDRAW_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  // Dev fallback — not for prod. The service role key is already a long
  // random string; deriving from it avoids hardcoding a dev secret and
  // surfaces a clear warning if prod ever forgets the env var.
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fallback) {
    throw new Error("WITHDRAW_SECRET (or SUPABASE_SERVICE_ROLE_KEY for dev) must be set");
  }
  console.warn("[withdraw-token] WITHDRAW_SECRET not set — using derived fallback. Set WITHDRAW_SECRET in prod.");
  return crypto.createHash("sha256").update("withdraw:" + fallback).digest("hex");
}

function sign(payload: string): string {
  return crypto.createHmac(ALGO, getSecret()).update(payload).digest(ENCODING);
}

export function createWithdrawToken(email: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const normalized = email.trim().toLowerCase();
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${normalized}:${expiry}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}:${sig}`, "utf8").toString(ENCODING);
}

export function verifyWithdrawToken(token: string): { ok: true; email: string } | { ok: false; reason: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(token, ENCODING).toString("utf8");
  } catch {
    return { ok: false, reason: "Malformed token." };
  }
  const parts = decoded.split(":");
  if (parts.length !== 3) return { ok: false, reason: "Malformed token." };
  const [email, expiryStr, sig] = parts;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry)) return { ok: false, reason: "Malformed token." };
  if (expiry < Math.floor(Date.now() / 1000)) return { ok: false, reason: "This link expired. Request a new one." };

  const expected = sign(`${email}:${expiry}`);
  const expectedBuf = Buffer.from(expected, ENCODING);
  const sigBuf = Buffer.from(sig, ENCODING);
  if (expectedBuf.length !== sigBuf.length) return { ok: false, reason: "Invalid token." };
  if (!crypto.timingSafeEqual(expectedBuf, sigBuf)) return { ok: false, reason: "Invalid token." };

  return { ok: true, email };
}
