"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { createWithdrawToken, verifyWithdrawToken } from "@/lib/withdraw-token";
import { sendWithdrawConfirmEmail } from "@/lib/email";

// Self-service withdrawal for public survey respondents.
// Respondents don't have accounts, so there's no session to authenticate
// against. Instead the flow is two-step:
//   1. User submits their email → we mail a signed token link.
//   2. User clicks the link → /privacy/withdraw/confirm validates the
//      token via verifyWithdrawToken() and performs the delete.
// This prevents an unauthenticated attacker from nuking arbitrary
// addresses' survey data (the previous one-step version did exactly that).
// To avoid email enumeration we always return ok regardless of whether
// the address has any data on file.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result = { ok: true } | { ok: false; error: string };

export async function requestWithdrawConfirmation(input: {
  email: string;
}): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Invalid email address." };

  // Build the absolute confirm URL from the current request's host.
  const h = await headers();
  const host = h.get("host") ?? "bccacademy.io";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const token = createWithdrawToken(email);
  const confirmUrl = `${proto}://${host}/privacy/withdraw/confirm?token=${encodeURIComponent(token)}`;

  try {
    await sendWithdrawConfirmEmail({ to: email, confirmUrl });
  } catch (err) {
    console.error("requestWithdrawConfirmation send failed:", err);
    // Still return ok so we don't reveal whether the address exists or
    // whether send failed. The user can retry; failures show up in logs.
  }

  return { ok: true };
}

export async function confirmWithdrawal(input: {
  token: string;
}): Promise<Result> {
  const result = verifyWithdrawToken(input.token);
  if (!result.ok) return { ok: false, error: result.reason };

  const svc = createServiceClient();
  const { error } = await svc
    .from("public_survey_responses")
    .delete()
    .eq("email", result.email);

  if (error) {
    console.error("confirmWithdrawal delete error:", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
