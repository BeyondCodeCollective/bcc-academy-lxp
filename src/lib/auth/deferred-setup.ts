import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
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
 *
 * Accepts the student's current state to skip redundant DB queries
 * when the caller already has this data from getSessionContext.
 */
export async function completePendingSetup(
  userId: string,
  email: string,
  program: ProgramConfig,
  trackParam?: string | null,
  currentCohortId?: string | null,
  currentRole?: string | null,
  welcomeSeenAt?: string | null,
): Promise<void> {
  const admin = createServiceClient();

  // Use the cached per-request program UUID instead of a fresh query
  const programId = await getProgramId();

  const isNew = !welcomeSeenAt;

  // 1. Look up or create cohort if student has none
  if (!currentCohortId) {
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

  // 2. Resolve the set of tracks this user should be enrolled in.
  // Admins and super_admins are not learners — skip track enrollment entirely.
  const role = currentRole ?? determineRole(email);
  if (role === "admin" || role === "super_admin") return;
  //
  // Two sources, OR'd together for invite-only programs:
  //   • `trackParam` — set when the user came in through a /join link with
  //     `?track=<slug>` and that slug propagated to the auth callback.
  //   • allowlist match — admins also pre-add learners to specific tracks via
  //     `allowed_signup_emails (email, track_slug)`. Treat that row as the
  //     intended enrollment, so a learner who signs in via /login (or the
  //     marketing apex, or a join link missing `?track=`) still lands in the
  //     right course instead of an empty dashboard.
  //
  // Open-enrollment programs (`requireInviteLink !== true`) keep the legacy
  // "enroll in every program track" behavior.
  let tracksToEnroll: ProgramConfig["tracks"] = [];
  if (program.requireInviteLink === true) {
    const trackParamTracks = program.tracks.filter((t) => t.slug === trackParam);

    let allowlistTracks: ProgramConfig["tracks"] = [];
    if (email) {
      const { data: rows, error: allowErr } = await admin
        .from("allowed_signup_emails")
        .select("track_slug")
        .eq("email", email.toLowerCase());
      if (allowErr) {
        console.error("[deferred-setup] allowlist lookup:", allowErr.message);
      } else {
        const slugs = new Set((rows ?? []).map((r) => r.track_slug as string));
        allowlistTracks = program.tracks.filter((t) => slugs.has(t.slug));
      }
    }

    tracksToEnroll = Array.from(
      new Map(
        [...trackParamTracks, ...allowlistTracks].map((t) => [t.slug, t]),
      ).values(),
    );
  } else {
    tracksToEnroll = program.tracks;
  }

  // Enroll on every sign-in (not just new users). Idempotent upsert on
  // (student_id, track_slug) — one enrollment per track regardless of program.
  // Re-running is a no-op when already enrolled; it self-heals a missed
  // enrollment AND updates program_id if the track has since moved programs
  // (e.g. Roblox: catalyst → bgc), so no stale program-ghost row is left.
  if (tracksToEnroll.length > 0) {
    const { error: trackErr } = await admin.from("student_tracks").upsert(
      tracksToEnroll.map((t) => ({
        student_id: userId,
        track_slug: t.slug,
        program_id: programId,
      })),
      { onConflict: "student_id,track_slug" },
    );

    if (trackErr) {
      console.error("[deferred-setup] track enrollment:", trackErr.message);
    }
  }

  // 3. Claim public survey submissions (new users only)
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

      // 4. Auto-complete intake if any claimed survey has all demographic answers
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

  // 5. Send welcome email (new users only)
  if (isNew && email) {
    const emailPrefix = email.split("@")[0];
    const derivedName =
      emailPrefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())[0] || "there";

    if (tracksToEnroll.length > 0) {
      // Durable one-click sign-in link for the welcome email — reuses the
      // invite-token flow, so the CTA works whenever they open it. The old
      // bare /dashboard link bounced unauthenticated clicks to /login.
      let signInUrl = `https://${program.domain}/dashboard`;
      const token = randomBytes(24).toString("base64url");
      const { error: invErr } = await admin.from("invites").insert({
        token,
        email,
        track_slug: tracksToEnroll[0].slug,
        program_slug: program.slug,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (!invErr) signInUrl = `https://${program.domain}/invite/${token}`;

      void sendWelcomeEmail({
        to: email,
        firstName: derivedName,
        program,
        enrolledTracks: tracksToEnroll,
        signInUrl,
      }).then(() =>
        admin
          .from("students")
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq("id", userId),
      );
    }
  }

  // 6. Role sync — handles both upgrades and downgrades
  const correctRole = determineRole(email);
  if (correctRole !== currentRole) {
    const { error: roleErr } = await admin
      .from("students")
      .update({ role: correctRole })
      .eq("id", userId);

    if (roleErr) {
      console.error("[deferred-setup] role update:", roleErr.message);
    }
  }
}
