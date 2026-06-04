# Learner Pathway Assessment — MVP Design Spec

**Date:** 2026-06-04
**Status:** Approved for implementation
**Framework version:** 0.3_draft (per PDF build packet)
**Scope:** MVP prototype for team testing — not a production launch

---

## Overview

The Catalyst Learner Pathway Alignment Tool is a 49-item self-report assessment across three scored modules. It produces a strengths-based reflection profile for the learner and a scored breakdown for facilitators. This spec covers the MVP: learner intake form, scoring engine, learner results profile, and a basic facilitator view.

**Out of scope for MVP:** program/track alignment layer, email notifications, retake logic, combined synthesis/bridging language layer.

---

## Program feature flags

The assessment (and onboarding surveys) should be configurable per program without a code deploy. A super admin can flip a switch in the admin panel to enable or disable the assessment for any program. Same pattern applies to required surveys.

**New table: `program_features`**

```sql
create table program_features (
  program_slug text primary key,
  assessment_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Seed defaults
insert into program_features (program_slug, assessment_enabled) values
  ('catalyst', true),
  ('forte',    false);
```

The assessment gate checks this table for the learner's current `program_slug`. When `assessment_enabled = false`, the assessment step is skipped entirely — the learner goes straight from demographic intake to their dashboard. Toggling it on activates the gate immediately for all new and returning learners in that program who haven't completed it yet.

This is the foundation for a broader feature-flag pattern. Future flags (e.g. `pre_survey_enabled`, `cohort_survey_enabled`) follow the same shape — add a column, read it at the gate, flip it from the admin panel.

**Admin toggle location:** `super_admin` panel → Program Settings → Features. A simple on/off toggle per program, no code required.

---

## User journey placement

```
/join/[slug] → register → first login
  → BCC demographic intake (required, existing)
  → [if assessment_enabled] Learner pathway assessment
      → [immediate] Learner results profile
      → [immediate] New completion appears in facilitator admin panel
  → Program pre-survey (program-specific, existing)
  → Dashboard
```

The assessment is prompted at `/dashboard/start` after the demographic intake is marked complete. Not a hard block for MVP — a clear call-to-action. One-time only per learner (no retake logic). Skipped entirely if `program_features.assessment_enabled = false` for the learner's program.

---

## Piece 1: Assessment form

**Route:** `/dashboard/assessment`
**Auth:** Required (authenticated learners only)
**Guard:** If `assessment_results` row exists for this user, redirect to `/dashboard/assessment/results`

### Module flow

Three modules in sequence. No per-module results shown during intake. Short transition messages between modules (copy from PDF).

| Module | Format | Items | Transition copy |
|---|---|---|---|
| Module 1A | Likert 1–5 | Items 1–14 | "That's the first half of Module 1. The next set is loading now." |
| Module 1B | Likert 1–5 | Items 15–27 | "That's Module 1. Module 2 is loading now. The format shifts to short scenarios." |
| Module 2 | Forced-choice | 12 scenarios | "That's Module 2. Module 3 is loading now. It's the last one, and the shortest." |
| Module 3 | Likert 1–5 | 10 items | "That's all three modules. Your profile is loading now." |

Module 1 is presented in two visual sections but scored as one module. No warm-up question before Module 1.

### Likert response scale (Modules 1 and 3)

`Strongly disagree` → `Disagree` → `Not sure / Sometimes` → `Agree` → `Strongly agree`
Scored 1–5 respectively.

### Forced-choice format (Module 2)

Each scenario presents two options as cards. Learner selects one. No neutral/skip option. A and B pole order alternates across scenarios so learners cannot pick one letter out of habit.

### New question type needed

Add `forced-choice` to `src/components/survey-fields.tsx`. Shape:
```ts
{
  type: "forced-choice",
  id: string,
  scenario: string,       // the situation prompt
  optionA: { label: string; pole: string },
  optionB: { label: string; pole: string },
  required: true,
}
```

### Progress indicator

Show module-level progress (Module 1 of 3, Module 2 of 3, etc.) — not item-level. Reduces perceived length.

### Partial completion

If a learner exits mid-intake, store responses as incomplete (no scoring). On return, resume from the module they left off. Do not generate results from incomplete data.

---

## Piece 2: Scoring engine

**Location:** `src/lib/assessment/scoring.ts`
**Trigger:** Server action called after Module 3 submission

### Module 1 — Archetype identity

49 items total across 9 archetypes, 3 items each. 5-point Likert.

```
Raw score per archetype = sum of 3 item scores
Average score = raw / 3
```

**Primary archetype** = highest average.
**Secondary archetype** = second-highest average, reported only if gap from primary ≤ 0.50.
**Blended profile** = primary and secondary reported together when gap ≤ 0.25.

**Confidence bands:**

| Band | Rule | Output |
|---|---|---|
| High confidence | Primary avg ≥ 4.00, gap ≥ 0.50 | Report primary clearly |
| Moderate confidence | Primary avg ≥ 3.50, gap 0.26–0.49 | Report primary, secondary optional |
| Blended | Gap ≤ 0.25 | Report primary + secondary as blended |
| Low confidence | Top avg < 3.25 | "Still taking shape" learner language |
| Very broad high | 5+ archetypes ≥ 4.00 | "Strengths across many areas" language |
| Very flat | All averages 2.75–3.50 | Flag exploratory, recommend coaching |

**Tie rules:**
- Two-way tie: blended profile using both.
- Three-way tie: top three as strong patterns, `facilitator_review = true`.
- Four or more tied: "still emerging" language, `facilitator_review = true`.

### Module 2 — Work style

4 axes × 3 forced-choice scenarios. Each option maps to one pole.

```
Per axis: count how many scenarios selected each pole
3-to-0 = clear lean
2-to-1 = lighter lean
```

Report a **position** on each axis, never a high/low score. Store signal strength (clear vs lighter) separately.

**Axes:**
- Social energy: Solo ↔ Collaborative
- Structure preference: Structured ↔ Adaptive
- Contribution mode: Front-facing ↔ Behind the scenes
- Pace: Quick-moving ↔ Methodical

If two or more axes oppose a track profile: flag `sustainability_risk = true` for facilitator attention (not exclusion logic).

### Module 3 — Motivation and pathway orientation

10 items. 9 forward-scored, 1 reverse-scored (`M3-RSK-04`).

```
Self-direction = avg(M3-SDR-01, M3-SDR-02, M3-SDR-03)
Stability-seeking = avg(M3-STB-01, M3-STB-02, M3-STB-03)
Risk comfort = avg(M3-RSK-01, M3-RSK-02, M3-RSK-03, reverse(M3-RSK-04))
```

Reverse scoring for M3-RSK-04: `scored_value = 6 - raw_value`

**Pathway orientation** (derived, not measured):

| Self-direction | Stability-seeking | Orientation |
|---|---|---|
| High (avg ≥ 3.5) | Low (avg < 3.5) | Ownership lean |
| Low (avg < 3.5) | High (avg ≥ 3.5) | Placement lean |
| High | High | Blended |
| Low | Low | Still exploring |

**Sustainability note condition:** Append conditional language to learner profile when `self_direction_avg ≥ 3.5` AND `risk_comfort_avg < 3.0`.

### Scoring output shape

```ts
type AssessmentResult = {
  // Module 1
  archetype_primary: ArchetypeKey;
  archetype_secondary: ArchetypeKey | null;
  archetype_is_blended: boolean;
  archetype_confidence: "high" | "moderate" | "blended" | "low" | "broad_high" | "flat";
  archetype_scores: Record<ArchetypeKey, number>; // averages, facilitator only
  facilitator_review: boolean;

  // Module 2
  social_energy: "solo" | "collaborative";
  social_energy_signal: "clear" | "lighter";
  structure_preference: "structured" | "adaptive";
  structure_preference_signal: "clear" | "lighter";
  contribution_mode: "front_facing" | "behind_the_scenes";
  contribution_mode_signal: "clear" | "lighter";
  pace: "quick_moving" | "methodical";
  pace_signal: "clear" | "lighter";
  sustainability_risk: boolean;

  // Module 3
  self_direction_avg: number;
  stability_seeking_avg: number;
  risk_comfort_avg: number;
  pathway_orientation: "ownership" | "placement" | "blended" | "exploring";
  sustainability_note: boolean;
};
```

---

## Piece 3: Learner results profile

**Route:** `/dashboard/assessment/results`
**Auth:** Required. Shows only the authenticated learner's own result.

### Layout

Progressive disclosure — summary at top, three expandable sections below.

**Summary card:**
- Primary archetype name + one-line definition (from PDF archetype bank)
- If blended: "Your profile shows a blended pattern: [Archetype A] and [Archetype B]"
- If low confidence: "Your strengths are still taking shape." developmental language (no archetype label)

**Section 1 — How you show up (Module 1)**
Learner-facing archetype narrative from PDF. For blended: both narratives shown.
No numeric scores shown. A simple non-numeric relative-strength visual is acceptable.

**Section 2 — How you tend to work (Module 2)**
Four axis results, each showing the leaned pole and its learner-facing narrative from PDF.
Signal strength shown in plain language: "clear lean" vs "lighter lean" (no numbers).
Universal framing line: "There are no better or worse answers here, just different ways of getting things done."

**Section 3 — What drives you (Module 3)**
Pathway orientation label and narrative from PDF.
Sustainability note appended conditionally (when self-direction high + risk comfort low).
Universal framing line: "This is about what serves you at this point in your life, not a fixed verdict about who you are."

**Closing line (across all sections):**
"This is a snapshot of how you tend to show up right now. It is a starting point, not a fixed label, and not a limit on what you can become."

### What learners never see
Raw scores, averages, percentages, confidence band labels, `facilitator_review` flag, "low-confidence primary," "needs reflection," or any technical scoring language.

---

## Piece 4: Database

**New table: `assessment_results`**

```sql
create table assessment_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_slug text not null,
  completed_at timestamptz not null default now(),
  raw_responses jsonb not null,        -- full item-level responses
  scored_output jsonb not null,        -- AssessmentResult shape above
  facilitator_viewed_at timestamptz,   -- null = "New" in facilitator view
  created_at timestamptz default now()
);

create unique index assessment_results_student_id_idx on assessment_results(student_id);
```

The `unique index` on `student_id` enforces one assessment per learner without retake logic.

**Partial completion table: `assessment_progress`**

```sql
create table assessment_progress (
  student_id uuid primary key references students(id) on delete cascade,
  current_module int not null default 1,
  responses_so_far jsonb not null default '{}',
  updated_at timestamptz default now()
);
```

Cleaned up (deleted) when scoring completes.

---

## Piece 5: Facilitator view

**Route:** `/dashboard/admin/assessments`
**Auth:** `admin`, `instructor`, `super_admin`

### List view

Table columns: Student name, Archetype, Pathway orientation, Completed date, "New" badge (when `facilitator_viewed_at` is null).

Sorted by `completed_at` descending. Filterable by archetype and pathway orientation.

When a facilitator opens a student's detail view, set `facilitator_viewed_at = now()` to clear the "New" badge.

### Detail view

`/dashboard/admin/assessments/[studentId]`

Shows the facilitator-facing report:
- All archetype averages (score table)
- Confidence band label
- `facilitator_review` flag if triggered (with coaching note)
- All 4 work-style axis positions with signal strength and coaching angle from PDF
- All 3 Module 3 sub-dimension averages
- Pathway orientation with facilitator framing from PDF
- Sustainability risk flag if triggered

Language throughout is the facilitator-facing copy from the PDF — includes coaching questions, growth edges, cross-module notes.

### New completion indicator

The admin home panel (`/dashboard/admin`) shows a count of assessments completed since the facilitator's last visit (using `facilitator_viewed_at is null`). This is the facilitator notification for MVP — visibility inside the panel, no email.

---

## Synthesis language workaround

The combined bridging/synthesis layer across all three modules has not been drafted. For MVP: results page shows the three sections in sequence with clear headers. The PDF's universal closing line runs as a footer across all three sections. No connective copy needed between sections — the section headers do that work. Revisit after pilot.

---

## Content source

All 49 questions, scoring formulas, archetype definitions, prewritten learner and facilitator language, transition messages, and guardrails come from:
`learnerpathwayassessmenttoolbuildpacket/catalyst_consolidated_build_packet-1.pdf`
Framework version: 0.3_draft

---

## Files to create / modify

| Action | Path |
|---|---|
| New | `src/lib/assessment/scoring.ts` |
| New | `src/lib/assessment/content.ts` (all questions + prewritten language blocks) |
| New | `src/lib/assessment/types.ts` |
| New | `src/lib/assessment/features.ts` (reads `program_features` flag) |
| New | `src/app/dashboard/assessment/page.tsx` |
| New | `src/app/dashboard/assessment/actions.ts` |
| New | `src/app/dashboard/assessment/results/page.tsx` |
| New | `src/app/dashboard/admin/assessments/page.tsx` |
| New | `src/app/dashboard/admin/assessments/[studentId]/page.tsx` |
| New | `src/app/dashboard/admin/programs/[slug]/features/page.tsx` (super_admin toggle UI) |
| Modify | `src/components/survey-fields.tsx` (add `forced-choice` type) |
| New | `supabase/migrations/assessment_tables.sql` |

---

## Out of scope

- Program/track alignment layer (add after more tracks exist)
- Email notifications to facilitators (add post-pilot)
- Retake logic
- Combined synthesis/bridging language (add post-pilot when Angel drafts it)
- Pilot analytics (inter-archetype correlation, option balance checks)
- Normalized scores (not until 100–200 completions)
