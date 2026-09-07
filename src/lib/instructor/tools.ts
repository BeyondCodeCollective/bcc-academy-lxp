import "server-only";
import { tool, jsonSchema } from "ai";
import type { Sandbox } from "@vercel/sandbox";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLab, runInLab, readLabFile, writeLabFile, type LabRun } from "./lab";
import { FLAG_REASONS } from "./prompt";

// Everything the instructor can DO, as AI SDK tools. Each one is scoped to
// one learner on one track; the route builds the set per request. Effects
// that the UI should show (a command that ran, a note saved, a flag filed)
// are collected in `events` and returned alongside the reply.

export type InstructorEvent =
  | { type: "lab"; command: string; exitCode: number; preview: string }
  | { type: "note"; key: string; value: string }
  | { type: "flag"; reason: string; note: string }
  | { type: "complete" };

export type ToolContext = {
  svc: SupabaseClient;
  studentId: string;
  programId: string;
  trackSlug: string;
  weekNumber: number;
  events: InstructorEvent[];
};

function preview(run: LabRun): string {
  const text = (run.stdout || run.stderr || "").trim();
  const lines = text.split("\n").slice(0, 12).join("\n");
  return lines.length > 600 ? lines.slice(0, 600) + "…" : lines;
}

export function buildInstructorTools(ctx: ToolContext) {
  // The sandbox is fetched lazily and once per request: most turns are talk,
  // not commands, and getOrCreate on a cold lab costs a few seconds.
  let labPromise: Promise<Sandbox> | null = null;
  const lab = () => (labPromise ??= getLab(ctx.studentId, ctx.trackSlug));

  return {
    lab_run: tool({
      description:
        "Run one shell command inside the course folder in the learner's hosted lab. python3 and node are available. Use for inspecting data, running tools you built, and evals. Never sudo, never network installs beyond pip/npm.",
      inputSchema: jsonSchema<{ command: string; why: string }>({
        type: "object",
        additionalProperties: false,
        required: ["command", "why"],
        properties: {
          command: { type: "string", description: "The shell command, run with sh -c from the course folder." },
          why: { type: "string", description: "One plain-English line the learner could read: what this does." },
        },
      }),
      execute: async ({ command, why }) => {
        const run = await runInLab(await lab(), command);
        ctx.events.push({ type: "lab", command: why, exitCode: run.exitCode, preview: preview(run) });
        return run;
      },
    }),

    lab_read: tool({
      description: "Read a file inside the course folder (relative path, e.g. data/program_rules.md).",
      inputSchema: jsonSchema<{ path: string }>({
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: { path: { type: "string" } },
      }),
      execute: async ({ path }) => ({ path, content: await readLabFile(await lab(), path) }),
    }),

    lab_write: tool({
      description:
        "Write a file inside the course folder. Put tools you build under mine/ and their outputs under output/. Overwrites.",
      inputSchema: jsonSchema<{ path: string; content: string; why: string }>({
        type: "object",
        additionalProperties: false,
        required: ["path", "content", "why"],
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          why: { type: "string", description: "One plain-English line: what this file is, for the learner." },
        },
      }),
      execute: async ({ path, content, why }) => {
        await writeLabFile(await lab(), path, content);
        ctx.events.push({ type: "lab", command: why, exitCode: 0, preview: `Saved ${path}` });
        return { ok: true, path };
      },
    }),

    save_deployment_note: tool({
      description:
        "Record one line of the learner's running example (their deployment). Upserts by key. Never store real personal data.",
      inputSchema: jsonSchema<{ key: string; value: string }>({
        type: "object",
        additionalProperties: false,
        required: ["key", "value"],
        properties: {
          key: { type: "string", description: "snake_case, e.g. workflow, owner, session_3_applies" },
          value: { type: "string" },
        },
      }),
      execute: async ({ key, value }) => {
        const k = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 64);
        const { error } = await ctx.svc.from("deployment_notes").upsert(
          {
            student_id: ctx.studentId,
            program_id: ctx.programId,
            track_slug: ctx.trackSlug,
            key: k,
            value: value.slice(0, 2000),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,track_slug,key" },
        );
        if (error) return { ok: false, error: error.message };
        ctx.events.push({ type: "note", key: k, value });
        return { ok: true, key: k };
      },
    }),

    flag_for_office_hours: tool({
      description:
        "Ask the human facilitator to weigh in at the next office hours. Use when the call is theirs, not yours. One short note.",
      inputSchema: jsonSchema<{ reason: (typeof FLAG_REASONS)[number]; note: string }>({
        type: "object",
        additionalProperties: false,
        required: ["reason", "note"],
        properties: {
          reason: { type: "string", enum: [...FLAG_REASONS] },
          note: { type: "string", description: "One line the facilitator can act on. No personal data." },
        },
      }),
      execute: async ({ reason, note }) => {
        const { error } = await ctx.svc.from("instructor_flags").insert({
          student_id: ctx.studentId,
          program_id: ctx.programId,
          track_slug: ctx.trackSlug,
          week_number: ctx.weekNumber,
          reason,
          note: note.slice(0, 1000),
        });
        if (error) return { ok: false, error: error.message };
        ctx.events.push({ type: "flag", reason, note });
        return { ok: true };
      },
    }),

    mark_session_complete: tool({
      description:
        "Mark this session complete for the learner. Only when every Do-This-First step is done and Apply-to-Your-Work is recorded.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: "object",
        additionalProperties: false,
        properties: {},
      }),
      execute: async () => {
        const now = new Date().toISOString();
        const { error } = await ctx.svc.from("week_progress").upsert(
          {
            user_id: ctx.studentId,
            program_id: ctx.programId,
            track_slug: ctx.trackSlug,
            week_number: ctx.weekNumber,
            completed_at: now,
            // Instructor-mode sessions have no video; the existing progress grid
            // keys off this column, so a finished session reads as done there too.
            video_watched_at: now,
            updated_at: now,
          },
          { onConflict: "user_id,track_slug,week_number" },
        );
        if (error) return { ok: false, error: error.message };
        ctx.events.push({ type: "complete" });
        return { ok: true };
      },
    }),
  };
}
