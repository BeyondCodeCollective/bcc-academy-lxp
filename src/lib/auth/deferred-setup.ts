import { createServiceClient } from "@/lib/supabase/server";
import type { ProgramConfig } from "@/lib/programs/types";
import { BCC_INTAKE_SURVEY_ID } from "@/lib/surveys/platform";
import { BCC_INTAKE_QUESTION_IDS } from "@/lib/surveys/schemas";
import { sendWelcomeEmail } from "@/lib/email";
import { determineRole } from "@/lib/auth/admins";

/**
 * Runs after login when the user hits the dashboard for the first time.
 * Handles cohort assignment, track enrollment, public survey claim,
 * intake auto-completion, and welcome email — all the work that was
 * previously done inline in the auth callback before the redirect.
 *
 * Every operation is idempotent: safe to call multiple times, and
 * returns immediately if the student is already fully set up.
 */
export async function completePendingSetup(
  userId: string,
  email: string,
  program: ProgramConfig,
  trackParam?: string | null,
): Promise<void> {
  const admin = createServiceClient();

  // 1. Fetch program UUID from DB
  const { data: programRow } = await admin
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .maybeSingle();

  if (!programRow) {
    console.warn("[deferred-setup] program not found:", program.slug);
    return;
  }

  const programId = programRow.id;

  // 2. Check student's current state
  const { data: student } = await admin
    .from("students")
    .select("id, cohort_id, role, welcome_email_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (!student) {
    console.warn("[deferred-setup] student not found:", userId);
    return;
  }

  const isNew = !student.welcome_email_sent_at;

  // 3. Look up or create cohort if student has none
  if (!student.cohort_id) {
    const defaultCohort = {
      name: program.defaultCohort.name,
      display_name: program.defaultCohort.displayName,
      start_date: program.defaultCohort.startDate,
      total_weeks: program.defaultCohort.totalWeeks,
    };

    const { data: existingCohort } = await admin
      .from("cohorts")
      .select("id")
      .eq("program_id", programId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let cohortId = existingCohort?.id;

    if (!cohortId) {
      const { data: newCohort } = await admin
        .from("cohorts")
        .insert({ ...defaultCohort, program_id: programId })
        .select("id")
        .single();

      cohortId = newCohort?.id;
    }

    if (cohortId) {
      const { error: updateErr } = await admin
        .from("students")
        .update({ cohort_id: cohortId })
        .eq("id", userId);

      if (updateErr) {
        console.error("[deferred-setup] cohort update:", updateErr.message);
      }
    }
  }

  // 4. Enroll in tracks (new users only)
  if (isNew) {
    const tracksToEnroll =
      program.requireInviteLink === true
        ? program.tracks.filter((t) => t.slug === trackParam)
        : program.tracks;

    if (tracksToEnroll.length > 0) {
      const { error: trackErr } = await admin.from("student_tracks").upsert(
        tracksToEnroll.map((t) => ({
          student_id: userId,
          track_slug: t.slug,
          program_id: programId,
        })),
        { onConflict: "student_id,track_slug,program_id" },
      );

      if (trackErr) {
        console.error("[deferred-setup] track enrollment:", trackErr.message);
      }
    }
  }

  // 5. Claim public survey submissions (new users only)
  if (isNew && email) {
    const { data: publicRows } = await admin
      .from("public_survey_responses")
      .select("program_id, survey_type, responses, completed_at")
      .eq("email", email.toLowerCase())
      .not("completed_at", "is", null);

    if (publicRows && publicRows.length > 0) {
      const claimRows = publicRows.map((r) => ({
        student_id: userId,
        survey_type: r.survey_type as string,
        responses: r.responses,
        completed_at: r.completed_at as string,
        program_id: r.program_id as string,
        updated_at: new Date().toISOString(),
      }));

      const { error: claimErr } = await admin.from("survey_responses").upsert(claimRows, {
        onConflict: "student_id,survey_type",
        ignoreDuplicates: true,
      });

      if (claimErr) {
        console.error("[deferred-setup] public survey claim:", claimErr.message);
      }

      // 6. Auto-complete intake if any claimed survey has all demographic answers
      const intakeAlreadyDone = publicRows.some(
        (r) => r.survey_type === BCC_INTAKE_SURVEY_ID && r.completed_at,
      );

      if (!intakeAlreadyDone) {
        const intakeSource = publicRows.find((r) => {
          const responses = (r.responses ?? {}) as Record<string, unknown>;
          return BCC_INTAKE_QUESTION_IDS.every((key) => {
            const v = responses[key];
            return v !== undefined && v !== null && v !== "";
          });
        });

        if (intakeSource) {
          const sourceResponses = (intakeSource.responses ?? {}) as Record<string, unknown>;
          const intakeResponses: Record<string, unknown> = {};
          for (const key of BCC_INTAKE_QUESTION_IDS) {
            intakeResponses[key] = sourceResponses[key];
          }

          const { error: intakeErr } = await admin
            .from("survey_responses")
            .upsert(
              {
                student_id: userId,
                survey_type: BCC_INTAKE_SURVEY_ID,
                responses: intakeResponses,
                completed_at: intakeSource.completed_at as string,
                program_id: intakeSource.program_id as string,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "student_id,survey_type", ignoreDuplicates: true },
            );

          if (intakeErr) {
            console.error("[deferred-setup] intake auto-complete:", intakeErr.message);
          }
        }
      }
    }
  }

  // 7. Send welcome email (new users only)
  if (isNew && email) {
    const tracksToEnroll =
      program.requireInviteLink === true
        ? program.tracks.filter((t) => t.slug === trackParam)
        : program.tracks;

    const emailPrefix = email.split("@")[0];
    const derivedName =
      emailPrefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())[0] || "there";

    if (tracksToEnroll.length > 0) {
      void sendWelcomeEmail({
        to: email,
        firstName: derivedName,
        program,
        enrolledTracks: tracksToEnroll,
      }).then(() =>
        admin
          .from("students")
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq("id", userId),
      );
    }
  }

  // 8. Role update for privileged users
  const correctRole = determineRole(email);
  if (correctRole !== "student" && student.role !== correctRole) {
    const { error: roleErr } = await admin
      .from("students")
      .update({ role: correctRole })
      .eq("id", userId);

    if (roleErr) {
      console.error("[deferred-setup] role update:", roleErr.message);
    }
  }
}
