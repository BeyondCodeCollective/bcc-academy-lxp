@AGENTS.md

# BCC Academy — Learning Experience Platform

## What This Is

BCC Academy is a **Digital Learning Ecosystem**. BCC (Beyond Code Collective) is the infrastructure — programs, tracks, and learning experiences run on top of it.

The platform is built in partnership with BGC (Black Girls Code). The founder of BCC is the CEO of BGC. Both organizations serve their communities through this shared platform.

**Philosophy:** Human in the lead. We teach the future — and it includes humans and technology together.

---

## Programs & Tracks

All programs route through a single hub — **Catalyst** at `bccacademy.io`. Legacy subdomains (`atg.bccacademy.io`, `forge.bccacademy.io`, `catalyst.bccacademy.io`) still resolve but redirect to Catalyst.

| Program | Slug | Domain | Status |
|---|---|---|---|
| Catalyst | `catalyst` | `bccacademy.io` | Active — unified hub |
| Forte | `forte` | `forte.bccacademy.io` | Active — Upskill Bahamas, AI Literacy |

**Active tracks inside Catalyst:**
- MASS Wraparound (coaching, weekly)
- CompTIA Tech+ Foundations
- CompTIA Network+
- AI Fundamentals
- AI for Digital Natives
- AI Automation Bootcamp
- Game Dev (upcoming)

**Lunch & Learns and Virtual Workshops** — delivered through the platform for BGC and BCC communities. These are distinct event types from weekly cohort tracks.

---

## Multi-Program Routing

Program detection resolves in this order:

1. Known production host → `DOMAIN_MAP` in `src/lib/programs/index.ts`
2. `program-override` cookie (super-admin switcher, overrides domain on non-prod)
3. `x-program-slug` header (set by middleware on every request)
4. `program-slug` cookie (fallback)

Track metadata can be overridden live via the `track_overrides` database table — no code deploy needed for track name, instructor, description, dates, or week summaries.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database | Supabase (Postgres + Auth) |
| Hosting | Vercel |
| Auth | Supabase Auth (email/password) |
| Styling | Tailwind CSS |

---

## Key Paths

```
src/lib/programs/          ← Program configs (catalyst.ts, forte.ts, atg.ts, forge.ts)
src/lib/programs/index.ts  ← DOMAIN_MAP and program registry
src/app/dashboard/         ← Authenticated learner portal
src/app/dashboard/admin/   ← Admin panel (role-gated)
src/app/apply/             ← Public application forms
src/app/survey/            ← Public surveys (no login required)
src/app/join/              ← Enrollment via invite link
supabase/migrations/       ← DB schema history
```

---

## Roles

| Role | Access |
|---|---|
| `student` | Dashboard only |
| `instructor` | Admin panel → their assigned tracks only |
| `admin` | Full admin panel for their program |
| `super_admin` | All programs + BCC-wide views + program switcher |

---

## Database Tables (key ones)

| Table | What it stores |
|---|---|
| `students` | All users — role, cohort, program, name, email |
| `track_overrides` | Live-editable track metadata (overrides TypeScript config) |
| `survey_responses` | Authenticated survey submissions |
| `public_survey_responses` | Public/walk-in survey submissions |
| `attendance` | Weekly attendance records |
| `submissions` | Student project/work per track week |
| `reflections` | Weekly reflection responses |
| `announcements` | Track-level announcements from instructors |
| `admin_access_log` | Audit trail for super_admin PII access |

---

## Development Workflow

Feature branch → PR → GitHub → Vercel auto-deploy. Git hooks block direct commits to main. Never push directly with `vercel --prod`.

---

## Coding Behavior Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused. Leave pre-existing dead code alone.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan with a verify step for each.
