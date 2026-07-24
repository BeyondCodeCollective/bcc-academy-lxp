"use server";

import { after } from "next/server";
import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/dashboard/admin/actions-shared";
import {
  sendApplicationConfirmationEmail,
  sendApplicationNotification,
} from "@/lib/email";

const APPLICATION_NAME = "Home for the Summer";

// Resume upload hardening. The form is public/anonymous, so the browser NEVER
// touches storage directly (no anon storage policy exists). Every upload comes
// through here, is validated server-side, and is written with the service role
// into a private bucket. Defense-in-depth: the bucket also enforces the same
// size + MIME limits on every write.
const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function uploadResume(
  formData: FormData,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size === 0) return { ok: false, error: "That file looks empty." };
  if (file.size > RESUME_MAX_BYTES) return { ok: false, error: "File is too large (max 5 MB)." };

  // Type allowlist by declared MIME AND extension — reject anything that isn't
  // clearly a PDF/Word doc. We never execute these; they're only ever handed
  // back to admins as a download via a signed URL.
  const ext = RESUME_TYPES[file.type];
  const nameLc = file.name.toLowerCase();
  const extOk = ext && (nameLc.endsWith(`.${ext}`) || (ext === "doc" && nameLc.endsWith(".doc")));
  if (!ext || !extOk) {
    return { ok: false, error: "Please upload a PDF or Word document (.pdf, .doc, .docx)." };
  }

  // Never trust the filename as a path. Hardcode the prefix, use a random id,
  // and sanitize the original name to a readable suffix (alnum/dot/dash only —
  // no slashes, so no traversal).
  const safeBase =
    file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) || "resume";
  const path = `hfs/${crypto.randomUUID()}-${safeBase}.${ext}`;

  const { error } = await createServiceClient()
    .storage.from("resumes")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("uploadResume failed:", error.message);
    return { ok: false, error: "Upload failed. Please try again." };
  }
  return { ok: true, path };
}

/** Admin-only: a short-lived signed download URL for a stored resume path. */
export async function getResumeSignedUrl(
  path: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!path.startsWith("hfs/")) return { ok: false, error: "Invalid resume path." };
  const { data, error } = await createServiceClient()
    .storage.from("resumes")
    .createSignedUrl(path, 60 * 5); // 5 minutes
  if (error || !data?.signedUrl) return { ok: false, error: "Could not generate link." };
  return { ok: true, url: data.signedUrl };
}

/** Reads a plain string answer, or undefined when absent/blank. */
function answer(answers: Record<string, unknown>, key: string): string | undefined {
  const v = answers[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function savePublicApplication(input: {
  email: string;
  answers: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullName =
    typeof input.answers.full_name === "string" ? input.answers.full_name.trim() : "";

  const result = await savePublicSurveyResponse({
    programSlug: "catalyst",
    surveyType: "home-for-summer-application",
    email: input.email,
    fullName,
    consentVersion: "home-for-summer-v1",
    responses: input.answers,
  });

  // Both emails go out AFTER the application is safely stored and outside the
  // response, so neither can delay or fail a submission. Both helpers also
  // swallow their own errors for the same reason.
  if (result.ok) {
    after(async () => {
      // Receipt for the applicant.
      await sendApplicationConfirmationEmail({
        to: input.email,
        firstName: fullName.split(/\s+/)[0] || undefined,
        programName: "Catalyst",
        applicationName: APPLICATION_NAME,
      });
      // Heads-up for the team, so applications surface without anyone
      // remembering to open admin → Insights.
      await sendApplicationNotification({
        name: fullName,
        email: input.email,
        applicationName: APPLICATION_NAME,
        details: {
          "Student status": answer(input.answers, "student_status"),
          University: answer(input.answers, "university"),
          Major: answer(input.answers, "major"),
          State: answer(input.answers, "state"),
          "Available for all sessions": answer(input.answers, "available_all_sessions"),
          "Heard about us": answer(input.answers, "heard_about_program"),
        },
      });
    });
  }

  return result;
}
