# Instructor mode

The AI Tutor answers questions. The **instructor** runs a session: one step at a
time, in a hosted lab it controls, with the learner talking rather than typing,
and a human facilitator one flag away. First used by the Forward Deploy (FDE)
track; built for any track.

| Piece | Where |
|---|---|
| Route | `src/app/api/instructor/route.ts` (separate from `/api/tutor` on purpose) |
| Prompt | `prompt.ts` — pure functions, printable and testable |
| Tools | `tools.ts` — lab, deployment notes, office-hours flag, session complete |
| Lab | `lab.ts` — one named, persistent Vercel Sandbox per (learner, track) |
| UI | `src/components/instructor-panel.tsx`, mounted on the week page when a lesson exists |
| Data | `supabase/migrations/instructor_mode.sql` |
| Seed | `scripts/seed-forward-deploy.mjs` |

**Availability is data-driven.** A session is in instructor mode when a
`session_lessons` row exists for `(track, week_number)`. No config flag.

**Human in the lead, enforced.** Four `human_checkpoints` only a facilitator can
write (`workflow_approved`, `data_sample_approved`, `ship_approved`,
`capstone_scored`). The instructor reads them and reminds; it never passes them.
When a call is a human's, the instructor files an `instructor_flags` row and
tells the learner to bring it to office hours. Office hours themselves are the
track's `office_hours` live sessions.

**Model.** `INSTRUCTOR_MODEL` env (default `anthropic/claude-sonnet-5`) through
the AI Gateway. The lesson plus the learner's notes is a long prompt and the
instructor drives tools for an hour; Flash-class models lose the thread. Usage
is logged to `tutor_messages` with this model string, so it's separable.

**Lab auth.** OIDC on Vercel, automatic. Locally: `vercel env pull` provides
`VERCEL_OIDC_TOKEN`. The lab is seeded once from the public course repo
tarball; the learner's work lives under `mine/` and `output/` and persists.

**Cost levers.** `DAILY_MESSAGE_LIMIT` and `MAX_STEPS` in the route;
`LAB_TIMEOUT_MS` and `COMMAND_TIMEOUT_MS` in `lab.ts`.
