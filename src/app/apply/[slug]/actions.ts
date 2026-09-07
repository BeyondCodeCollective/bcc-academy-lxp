"use server";

import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getApplicationBySlug, isAccepting, answersSatisfyRequired } from "@/lib/applications";
import { sendApplicationNotification } from "@/lib/email";

export async function submitApplicationAction(input: {
  slug: string;
  fullName: string;
  email: string;
  answers: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const app = await getApplicationBySlug(input.slug);
  if (!app || !isAccepting(app)) {
    return { ok: false, error: "This application is no longer accepting submissions." };
  }
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !input.fullName.trim()) {
    return { ok: false, error: "Add your name and a valid email address." };
  }

  // Keep only answers to questions this application actually asks — a crafted
  // request can't stuff arbitrary payloads into the row.
  const validIds = new Set(app.questions.map((q) => q.id));
  const answers = Object.fromEntries(
    Object.entries(input.answers).filter(([k]) => validIds.has(k)),
  );

  // The client validates too, but a direct POST skips it — required answers
  // and consent boxes are enforced here or they aren't enforced at all.
  if (!answersSatisfyRequired(app.questions, answers)) {
    return { ok: false, error: "Answer every required question before submitting." };
  }

  const svc = createServiceClient();
  // A resubmit from the same email updates the answers rather than erroring —
  // people fix typos — but never resets a decision already made.
  const { error } = await svc.from("application_submissions").upsert(
    {
      application_id: app.id,
      email,
      full_name: input.fullName.trim(),
      answers,
    },
    { onConflict: "application_id,email" },
  );
  if (error) {
    console.error("[submitApplicationAction] insert failed:", error);
    return { ok: false, error: "Could not save your application. Please try again." };
  }

  after(async () => {
    await sendApplicationNotification({
      name: input.fullName.trim(),
      email,
      applicationName: app.title,
      to: app.notifyEmail ?? undefined,
    });
  });

  return { ok: true };
}
