# Learner Pathway Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP learner pathway assessment — 49-question wizard, scoring engine, learner results profile, and a basic facilitator view in the admin panel.

**Architecture:** Three scored modules (27 Likert + 12 forced-choice + 10 Likert) run through a multi-step form. A server action scores responses on completion and writes structured output to `assessment_results`. Learner sees their profile immediately. Admin panel shows a list of completions with a detail view per student. A `program_features` table controls whether the assessment is active for a given program.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Tailwind CSS, TypeScript, `createServiceClient` for server actions, `getSessionContext` for auth.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| New | `supabase/migrations/20260604000000_assessment_tables.sql` | Three new tables: `assessment_results`, `assessment_progress`, `program_features` |
| New | `src/lib/assessment/types.ts` | All TypeScript types for the assessment |
| New | `src/lib/assessment/content.ts` | All 49 questions + prewritten learner/facilitator language blocks |
| New | `src/lib/assessment/scoring.ts` | Pure scoring functions — no DB calls |
| New | `src/lib/assessment/features.ts` | `isAssessmentEnabled(programSlug)` — reads `program_features` |
| Modify | `src/components/survey-fields.tsx` | Add `ForcedChoiceQuestion` type + `ForcedChoiceField` component |
| New | `src/app/dashboard/assessment/actions.ts` | `saveProgress`, `submitAssessment` server actions |
| New | `src/app/dashboard/assessment/page.tsx` | Assessment wizard page (server component shell) |
| New | `src/app/dashboard/assessment/assessment-wizard.tsx` | Client-side multi-step wizard |
| New | `src/app/dashboard/assessment/results/page.tsx` | Learner results profile (server component) |
| New | `src/app/dashboard/assessment/results/results-profile.tsx` | Results UI (client component) |
| New | `src/app/dashboard/admin/assessments/page.tsx` | Admin list of all completions |
| New | `src/app/dashboard/admin/assessments/[studentId]/page.tsx` | Facilitator detail view per student |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260604000000_assessment_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260604000000_assessment_tables.sql

-- Program-level feature flags. Controls whether the assessment gate is
-- active for a given program. Toggleable from admin panel with no deploy.
create table if not exists program_features (
  program_slug text primary key,
  assessment_enabled boolean not null default false,
  pre_survey_id  text,
  post_survey_id text,
  mid_survey_id  text,
  updated_at timestamptz not null default now()
);

-- Seed defaults: Catalyst on, everything else off.
insert into program_features (program_slug, assessment_enabled) values
  ('catalyst', true),
  ('atg',      false),
  ('forte',    false),
  ('forge',    false)
on conflict (program_slug) do nothing;

-- Stores a learner's in-progress responses between sessions.
-- Deleted when scoring completes.
create table if not exists assessment_progress (
  student_id uuid primary key references students(id) on delete cascade,
  current_module int not null default 1,
  responses_so_far jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Stores the final scored output for each learner. One row per learner
-- (unique index enforces no retakes without explicit logic).
create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_slug text not null,
  completed_at timestamptz not null default now(),
  raw_responses jsonb not null,
  scored_output jsonb not null,
  facilitator_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists assessment_results_student_id_idx
  on assessment_results(student_id);

-- RLS: learners can only read their own result.
alter table assessment_results enable row level security;
alter table assessment_progress enable row level security;
alter table program_features enable row level security;

create policy "learner reads own result"
  on assessment_results for select
  using (auth.uid() = student_id);

create policy "learner reads own progress"
  on assessment_progress for select
  using (auth.uid() = student_id);

create policy "program_features readable by all"
  on program_features for select
  using (true);
```

- [ ] **Step 2: Apply the migration via Supabase MCP or CLI**

```bash
# Option A — CLI (if supabase CLI is set up locally)
supabase db push

# Option B — paste directly into Supabase SQL editor for the project
```

- [ ] **Step 3: Verify tables exist**

In Supabase table editor, confirm `program_features`, `assessment_progress`, and `assessment_results` all appear. Check that `program_features` has four seed rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604000000_assessment_tables.sql
git commit -m "feat: add assessment_results, assessment_progress, program_features tables"
```

---

## Task 2: Types

**Files:**
- Create: `src/lib/assessment/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// src/lib/assessment/types.ts

export type ArchetypeKey =
  | "navigator"
  | "developer"
  | "igniter"
  | "connector"
  | "systems_thinker"
  | "culture_keeper"
  | "designer"
  | "support_specialist"
  | "explorer";

export type ArchetypeConfidence =
  | "high"
  | "moderate"
  | "blended"
  | "low"
  | "broad_high"
  | "flat";

export type WorkStylePole =
  | "solo" | "collaborative"
  | "structured" | "adaptive"
  | "front_facing" | "behind_the_scenes"
  | "quick_moving" | "methodical";

export type SignalStrength = "clear" | "lighter";

export type PathwayOrientation = "ownership" | "placement" | "blended" | "exploring";

export type ScoredOutput = {
  // Module 1
  archetype_primary: ArchetypeKey;
  archetype_secondary: ArchetypeKey | null;
  archetype_is_blended: boolean;
  archetype_confidence: ArchetypeConfidence;
  archetype_scores: Record<ArchetypeKey, number>; // averages — facilitator only
  facilitator_review: boolean;

  // Module 2
  social_energy: "solo" | "collaborative";
  social_energy_signal: SignalStrength;
  structure_preference: "structured" | "adaptive";
  structure_preference_signal: SignalStrength;
  contribution_mode: "front_facing" | "behind_the_scenes";
  contribution_mode_signal: SignalStrength;
  pace: "quick_moving" | "methodical";
  pace_signal: SignalStrength;
  sustainability_risk: boolean;

  // Module 3
  self_direction_avg: number;
  stability_seeking_avg: number;
  risk_comfort_avg: number;
  pathway_orientation: PathwayOrientation;
  sustainability_note: boolean;
};

// Raw responses keyed by item ID (e.g. "M1-NAV-01" → 4, "M2-SOC-01" → "solo")
export type RawResponses = Record<string, number | string>;

export type AssessmentResultRow = {
  id: string;
  student_id: string;
  program_slug: string;
  completed_at: string;
  raw_responses: RawResponses;
  scored_output: ScoredOutput;
  facilitator_viewed_at: string | null;
  created_at: string;
};

export type AssessmentProgressRow = {
  student_id: string;
  current_module: number;
  responses_so_far: RawResponses;
  updated_at: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/assessment/types.ts
git commit -m "feat: add assessment types"
```

---

## Task 3: Content — questions and language blocks

**Files:**
- Create: `src/lib/assessment/content.ts`

This file holds all 49 questions and all prewritten output language from the build packet PDF. It is long but pure data — no logic.

- [ ] **Step 1: Write the content file**

```ts
// src/lib/assessment/content.ts
import type { ArchetypeKey, PathwayOrientation } from "./types";

// ─── Likert scale (Modules 1 and 3) ──────────────────────────────────────────

export const LIKERT_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Not sure / Sometimes",
  "Agree",
  "Strongly agree",
] as const;

// ─── Module 1: Archetype identity (27 items) ─────────────────────────────────

export type M1Item = { id: string; text: string; archetype: ArchetypeKey };

export const MODULE_1_ITEMS: M1Item[] = [
  // Navigator
  { id: "M1-NAV-01", text: "I like understanding the bigger purpose before I start working on something.", archetype: "navigator" },
  { id: "M1-NAV-02", text: "I often think about where a project or idea is headed.", archetype: "navigator" },
  { id: "M1-NAV-03", text: "I often think about what the goal is and what step comes next, even when working on my own.", archetype: "navigator" },
  // Developer
  { id: "M1-DEV-01", text: "I like turning ideas into something real that people can use, test, or improve.", archetype: "developer" },
  { id: "M1-DEV-02", text: "I enjoy hands-on tasks where I can build, fix, or figure something out.", archetype: "developer" },
  { id: "M1-DEV-03", text: "I feel motivated when I can see something I am building or fixing come together.", archetype: "developer" },
  // Igniter
  { id: "M1-IGN-01", text: "When something needs to get started, I am usually willing to take the first step.", archetype: "igniter" },
  { id: "M1-IGN-02", text: "I like helping ideas move from talking into action.", archetype: "igniter" },
  { id: "M1-IGN-03", text: "I am willing to get started even when the plan is not fully figured out yet.", archetype: "igniter" },
  // Connector
  { id: "M1-CON-01", text: "I often notice when people, ideas, or resources need to be connected.", archetype: "connector" },
  { id: "M1-CON-02", text: "When I see two people or ideas that should connect, I often help make that link happen.", archetype: "connector" },
  { id: "M1-CON-03", text: "When two people are talking past each other, I often step in to help them understand each other.", archetype: "connector" },
  // Systems Thinker
  { id: "M1-SYS-01", text: "I often look for the patterns or causes behind a problem.", archetype: "systems_thinker" },
  { id: "M1-SYS-02", text: "I like figuring out how the different parts of something fit together.", archetype: "systems_thinker" },
  { id: "M1-SYS-03", text: "Before choosing a solution, I often want to understand what is really causing the issue.", archetype: "systems_thinker" },
  // Culture Keeper
  { id: "M1-CUL-01", text: "I notice when the mood or energy in a group changes.", archetype: "culture_keeper" },
  { id: "M1-CUL-02", text: "I often do small things to help people feel included.", archetype: "culture_keeper" },
  { id: "M1-CUL-03", text: "When a group feels tense, I often try to help things feel calmer.", archetype: "culture_keeper" },
  // Designer
  { id: "M1-DES-01", text: "I like making things easier and more pleasant to use.", archetype: "designer" },
  { id: "M1-DES-02", text: "I notice when something feels confusing, hard to use, or poorly organized.", archetype: "designer" },
  { id: "M1-DES-03", text: "I enjoy shaping how something looks, feels, sounds, or works for the person using it.", archetype: "designer" },
  // Support Specialist
  { id: "M1-SUP-01", text: "I usually stay patient when I am helping someone work through a problem.", archetype: "support_specialist" },
  { id: "M1-SUP-02", text: "I like helping people feel less stuck, confused, or overwhelmed.", archetype: "support_specialist" },
  { id: "M1-SUP-03", text: "When I explain something, I often break it into small steps so it is easier to follow.", archetype: "support_specialist" },
  // Explorer
  { id: "M1-EXP-01", text: "I like trying different options before deciding what direction fits me best.", archetype: "explorer" },
  { id: "M1-EXP-02", text: "I learn a lot by trying things out and asking questions.", archetype: "explorer" },
  { id: "M1-EXP-03", text: "I am interested in more than one path and like having room to discover what fits.", archetype: "explorer" },
];

// ─── Module 2: Work style scenarios (12 forced-choice) ───────────────────────

export type M2Scenario = {
  id: string;
  scenario: string;
  optionA: { label: string; pole: string; dimension: string };
  optionB: { label: string; pole: string; dimension: string };
};

export const MODULE_2_SCENARIOS: M2Scenario[] = [
  // Social energy
  {
    id: "M2-SOC-01",
    scenario: "You're handed a new project to figure out over the next couple of weeks. What's your instinct?",
    optionA: { label: "Dig into it on your own first, then bring people in once you have something.", pole: "solo", dimension: "social_energy" },
    optionB: { label: "Pull a few people together early to think it through out loud.", pole: "collaborative", dimension: "social_energy" },
  },
  {
    id: "M2-SOC-02",
    scenario: "You're stuck on a problem. What's your first move?",
    optionA: { label: "Step back and work it out yourself. You usually find it by digging in.", pole: "solo", dimension: "social_energy" },
    optionB: { label: "Talk it through with someone. You think better bouncing it off another person.", pole: "collaborative", dimension: "social_energy" },
  },
  {
    id: "M2-SOC-03",
    scenario: "Your team needs to come up with ideas. What gets your best thinking going?",
    optionA: { label: "Brainstorming out loud with the group.", pole: "collaborative", dimension: "social_energy" },
    optionB: { label: "Going off to think on your own, then bringing your ideas back.", pole: "solo", dimension: "social_energy" },
  },
  // Structure preference
  {
    id: "M2-STR-01",
    scenario: "Halfway through a project, the plan changes. What's your natural response?",
    optionA: { label: "Roll with it and adjust as you go.", pole: "adaptive", dimension: "structure_preference" },
    optionB: { label: "Pause and map out a new clear plan before moving on.", pole: "structured", dimension: "structure_preference" },
  },
  {
    id: "M2-STR-02",
    scenario: "You're handed a task you've never done before. What would you rather have?",
    optionA: { label: "Knowing exactly what's expected, so you can get straight to it.", pole: "structured", dimension: "structure_preference" },
    optionB: { label: "Just the goal, and room to work out your own way to it.", pole: "adaptive", dimension: "structure_preference" },
  },
  {
    id: "M2-STR-03",
    scenario: "Which kind of work day actually suits you better?",
    optionA: { label: "One with a clear schedule and a set list to get through.", pole: "structured", dimension: "structure_preference" },
    optionB: { label: "One where you decide as you go what to work on next.", pole: "adaptive", dimension: "structure_preference" },
  },
  // Contribution mode
  {
    id: "M2-CON-01",
    scenario: "A new project is kicking off. Which part would you rather take on?",
    optionA: { label: "Being the face of it — the one who talks to people and represents the work.", pole: "front_facing", dimension: "contribution_mode" },
    optionB: { label: "Building the parts that make it work, out of the spotlight.", pole: "behind_the_scenes", dimension: "contribution_mode" },
  },
  {
    id: "M2-CON-02",
    scenario: "You're asked to demo your work to a room of people. What's your instinct?",
    optionA: { label: "You're happy to be the one up front presenting it.", pole: "front_facing", dimension: "contribution_mode" },
    optionB: { label: "You'd rather have built it and let someone else present.", pole: "behind_the_scenes", dimension: "contribution_mode" },
  },
  {
    id: "M2-CON-03",
    scenario: "When a project is running, which role fits you better?",
    optionA: { label: "Being the person heads-down on the work itself.", pole: "behind_the_scenes", dimension: "contribution_mode" },
    optionB: { label: "Being the person others come to with questions — the point of contact.", pole: "front_facing", dimension: "contribution_mode" },
  },
  // Pace
  {
    id: "M2-PAC-01",
    scenario: "You've got a task to complete. How do you tend to work?",
    optionA: { label: "Get a rough version done fast, then improve it.", pole: "quick_moving", dimension: "pace" },
    optionB: { label: "Take your time and get it right the first time.", pole: "methodical", dimension: "pace" },
  },
  {
    id: "M2-PAC-02",
    scenario: "You're up against a deadline. What's your default?",
    optionA: { label: "Pick up the pace and keep things moving. You'd rather get it done.", pole: "quick_moving", dimension: "pace" },
    optionB: { label: "Hold your pace and stay careful. You'd rather get it right.", pole: "methodical", dimension: "pace" },
  },
  {
    id: "M2-PAC-03",
    scenario: "You have to make a decision on something. How do you usually go?",
    optionA: { label: "Take your time to weigh it carefully first.", pole: "methodical", dimension: "pace" },
    optionB: { label: "Make the call quickly and keep moving.", pole: "quick_moving", dimension: "pace" },
  },
];

// ─── Module 3: Motivation and pathway orientation (10 items) ─────────────────

export type M3Item = {
  id: string;
  text: string;
  dimension: "self_direction" | "stability_seeking" | "risk_comfort";
  reverse?: boolean;
};

export const MODULE_3_ITEMS: M3Item[] = [
  // Self-direction
  { id: "M3-SDR-01", text: "I feel most invested in work when it is mine to shape and direct.", dimension: "self_direction" },
  { id: "M3-SDR-02", text: "The idea of building something of my own appeals to me more than joining something that already exists.", dimension: "self_direction" },
  { id: "M3-SDR-03", text: "I want to be responsible for how the whole thing turns out, not just my part of it.", dimension: "self_direction" },
  // Stability-seeking
  { id: "M3-STB-01", text: "Knowing my income is steady matters a lot to me.", dimension: "stability_seeking" },
  { id: "M3-STB-02", text: "I feel more at ease when I know what to expect from one week to the next.", dimension: "stability_seeking" },
  { id: "M3-STB-03", text: "I want work that gives me solid ground to build the rest of my life on.", dimension: "stability_seeking" },
  // Risk comfort
  { id: "M3-RSK-01", text: "Not knowing exactly how things will turn out does not bother me much.", dimension: "risk_comfort" },
  { id: "M3-RSK-02", text: "If money were not a worry, I would be willing to take a chance on something uncertain.", dimension: "risk_comfort" },
  { id: "M3-RSK-03", text: "When I try something new and get it wrong at first, it doesn't really bother me.", dimension: "risk_comfort" },
  { id: "M3-RSK-04", text: "A long stretch of not knowing how things will turn out would wear on me.", dimension: "risk_comfort", reverse: true },
];

// ─── Transition messages ──────────────────────────────────────────────────────

export const TRANSITION_MESSAGES = {
  afterM1A: "That's the first half of Module 1. The next set is loading now.",
  afterM1B: "That's Module 1. Module 2 is loading now. The format shifts to short scenarios.",
  afterM2:  "That's Module 2. Module 3 is loading now. It's the last one, and the shortest.",
  afterM3:  "That's all three modules. Your profile is loading now.",
} as const;

// ─── Archetype content ────────────────────────────────────────────────────────

export type ArchetypeContent = {
  name: string;
  definition: string;
  learner: string;
  facilitator: string;
};

export const ARCHETYPE_CONTENT: Record<ArchetypeKey, ArchetypeContent> = {
  navigator: {
    name: "Navigator",
    definition: "Orients toward direction and purpose. Wants to understand where something is headed and why before acting, and keeps the goal in view when others lose it in the details.",
    learner: "You want to understand the point of something before you dive in. You think about where things are headed, not just what is in front of you, and you tend to hold onto the goal when other people get lost in the details. That sense of direction is genuinely useful. As you grow, the edge is acting before everything is fully clear, because the world rarely hands you the whole map first. Your instinct for purpose is a strong place to build from.",
    facilitator: "Leads with purpose and direction. Engages best when the why and the destination are clear, and can stall on work that feels pointless. Strength: big-picture orientation, keeping the goal in view. Growth edge: tolerating ambiguity, starting before the picture is complete. Cross-module: a Navigator who is also methodical and structured will especially want clarity up front; an adaptive one moves more easily. Coaching angle: connect tasks to the larger purpose, and practice taking first steps with incomplete information.",
  },
  developer: {
    name: "Developer",
    definition: "Turns ideas into real, working things. Motivated by hands-on building, fixing, and visible progress on something they are making.",
    learner: "You like making things real. Ideas are fine, but you come alive when you can build, fix, or get your hands on something and watch it work. Seeing something you made come together is what keeps you going. That drive to produce is a real asset, especially in tech, where so much of the work is building. As you grow, the edge is stepping back to ask why and for whom before you build, so your skill goes toward what matters most.",
    facilitator: "Motivated by tangible output. Thrives with projects and prototypes, loses energy in long abstract discussion. Strength: making ideas real, persistence through building. Growth edge: pausing to weigh purpose and user before constructing. Cross-module: high Module 3 self-direction leans toward building their own thing; high stability-seeking prefers building inside an established team. Coaching angle: give them something to make early, tied to a clear purpose so they do not optimize the wrong thing well.",
  },
  igniter: {
    name: "Igniter",
    definition: "Provides activation energy. Starts things, takes the first step, and moves ideas from talk into action, even before the plan is fully formed.",
    learner: "You get things moving. When a group is stuck talking, you are the one who actually starts. You are willing to take the first step before everything is figured out, and that momentum is something a lot of people lack. Groups need it. As you grow, the edge is pairing your fast start with follow-through, so the things you kick off also get finished well.",
    facilitator: "Brings initiative and momentum, comfortable starting before conditions are perfect. Strength: activation, bias toward action. Growth edge: follow-through past the exciting start. Cross-module: keep Igniter (starting) separate from Module 2 pace (speed); an Igniter can be methodical once underway. High initiative with low Module 3 risk comfort can mean someone who starts boldly but strains under sustained uncertainty. Coaching angle: channel the starting energy, then build structure that supports finishing.",
  },
  connector: {
    name: "Connector",
    definition: "Bridges separate people, ideas, and resources. Notices useful links others miss and helps different parties understand each other.",
    learner: "You see connections other people miss. You notice when two people, or two ideas, should be linked, and you often make that link happen. When people are talking past each other, you are the one who helps them actually understand. That bridging instinct is rare and valuable, in tech and everywhere. As you grow, the edge is protecting time for your own focused work, because connectors can give so much to others that their own projects keep waiting.",
    facilitator: "Thinks in links and relationships across people, ideas, and resources. A natural bridge and translator. Strength: communication across difference, spotting useful links. Growth edge: protecting their own focus, not over-extending into everyone's needs. Cross-module: keep Connector (identity) separate from Module 2 social energy (work preference); a Connector can still prefer solo work. Coaching angle: use the bridging in real roles, and watch that they do not become the unpaid glue who never advances their own goals.",
  },
  systems_thinker: {
    name: "Systems Thinker",
    definition: "Looks for patterns, causes, and structure. Wants to understand how parts fit and what is really driving a problem before choosing a solution.",
    learner: "You want to understand how things actually work. You look for the patterns and the real causes behind a problem instead of reacting to the surface, and before you pick a solution you want to know what is really going on underneath. That depth is a serious strength, especially in technical work, where the obvious answer is often the wrong one. As you grow, the edge is knowing when you have analyzed enough and it is time to decide and move.",
    facilitator: "Analyzes structure and causation, strong at root-cause work. Strength: analytical depth, pattern recognition, getting past symptoms. Growth edge: analysis paralysis, knowing when understanding is enough. Cross-module: a Systems Thinker who is also methodical especially needs permission to stop analyzing and decide. Coaching angle: value the depth, give clear decision points so analysis converts to action.",
  },
  culture_keeper: {
    name: "Culture Keeper",
    definition: "Tends the emotional climate of a group. Notices shifts in mood and energy, helps people feel included, and steadies a group when things get tense.",
    learner: "You feel the temperature of a room. You notice when the mood in a group shifts, often before anyone says anything, and you do small things to help people feel included and to keep things steady when they get tense. That care for how a group feels is a real strength, and it is the kind of thing that makes teams actually work. As you grow, the edge is tending to your own needs too, not only everyone else's, so the care you give does not run you empty.",
    facilitator: "Attends to group climate, belonging, and morale, senses mood shifts early. Strength: emotional awareness, inclusion, group stability. Growth edge: boundaries and self-care, since they often carry the group's emotional load. Cross-module: distinguish Culture Keeper (tending the collective) from Support Specialist (helping an individual) and from Module 2 social energy (preferring group work). Coaching angle: name and value the emotional labor explicitly, help them set boundaries so they do not absorb everyone's stress.",
  },
  designer: {
    name: "Designer",
    definition: "Shapes how things look, feel, and work for the person using them. Notices when something is confusing or hard to use and makes it clearer and more pleasant.",
    learner: "You notice when something is clunky, confusing, or hard to use, and it bothers you in a way it does not bother most people. You like shaping how a thing looks, feels, and works for whoever is on the other end of it. That eye for the experience is a genuine strength, and it is exactly what good design and good technology depend on. As you grow, the edge is balancing making something good with getting it in front of people, because real feedback beats endless polishing.",
    facilitator: "Focuses on usability and the craft of how a thing works for its user, notices friction and wants to fix it. Strength: user empathy, attention to experience, quality of craft. Growth edge: perfectionism, knowing when good enough is enough to ship and learn. Cross-module: separate Designer (shaping the artifact) from Connector (bridging people) and Developer (building function); a methodical Designer especially tends toward over-polishing. Coaching angle: protect the craft, give deadlines and real users so polishing becomes iteration.",
  },
  support_specialist: {
    name: "Support Specialist",
    definition: "Helps a person get unstuck. Patient one-on-one troubleshooting, breaking things into steps, and steadying someone who is struggling.",
    learner: "You are the person others come to when they are stuck. You stay patient while someone works through something hard, and you have a way of breaking a confusing thing into small steps until it finally makes sense to them. Helping someone go from lost to capable is something you do well, and probably do often. That is a real strength, and it is the heart of a lot of good technical work. As you grow, the edge is pursuing your own learning and goals too, not only helping everyone else reach theirs.",
    facilitator: "Excels at one-on-one help, troubleshooting, and patient explanation, meeting a struggling person where they are. Strength: patience, breaking down complexity, steadying others. Growth edge: advancing their own goals, avoiding being typecast purely as helper. Cross-module: distinguish Support (helping one person) from Connector (linking many) and Culture Keeper (tending the group). Coaching angle: value the helping, and actively create space for their own advancement so the strength does not cap their growth.",
  },
  explorer: {
    name: "Explorer",
    definition: "Driven by curiosity and openness. Tries different options, learns by experimenting, and stays interested in more than one path before committing.",
    learner: "You like to try things before you commit. You learn by experimenting and asking questions, and you are genuinely interested in more than one path, which means you want room to discover what actually fits you. That openness is a strength, especially right now, while you are figuring out where you are headed. As you grow, the edge is committing to something long enough to go deep, because the richest discoveries often come after you stop sampling and stay a while.",
    facilitator: "Curious, keeps options open, learns through experimentation, resists premature commitment. Strength: adaptability, breadth, willingness to try. Growth edge: committing and going deep rather than staying at the surface across many things. Cross-module: a flat or blended Module 1 result is common and consistent with a genuine Explorer, so do not over-pathologize it; pair with Module 3 to see what they are reaching toward. Coaching angle: honor the exploration phase, help them set a project or time boundary to practice depth without feeling trapped.",
  },
};

// ─── Low-confidence / special-case learner language ──────────────────────────

export const SPECIAL_CASE_LANGUAGE = {
  low_confidence: "Your strengths are still taking shape. This is normal, especially when you are exploring new environments. Beyond Code Collective coaches and instructors will help you build on what is already showing up.",
  broad_high: "Your responses show strengths across many areas. This often means you adapt to different situations or bring range. Beyond Code Collective coaches and instructors will help you identify where to focus first.",
  flat: "Your pattern is showing range across several strengths. This is a starting point for a coaching conversation, not a final picture.",
  closing: "This is a snapshot of how you tend to show up right now. It is a starting point, not a fixed label, and not a limit on what you can become.",
};

// ─── Work style language ──────────────────────────────────────────────────────

export type WorkStyleContent = { learner: string; facilitator: string };

export const WORK_STYLE_CONTENT: Record<string, WorkStyleContent> = {
  // Social energy
  solo: {
    learner: "You tend to do your best work with some space to yourself. You like to think things through and make progress on your own before bringing others in. That focus is a real strength, and a lot of deep work needs exactly that. One thing to keep in view as you grow is staying connected enough that you do not miss what other people could add.",
    facilitator: "Solo lean: learner does best work independently. Coaching angle: match early tasks to solo mode, build in deliberate group touchpoints so they do not disappear when stuck.",
  },
  collaborative: {
    learner: "You tend to do your best work alongside other people. Talking things through and thinking out loud is where your ideas come alive. That energy is a real strength, and good teams run on it. One thing to keep in view as you grow is carving out some focused solo time too, since some work gets done best in quiet.",
    facilitator: "Collaborative lean: learner energized by group work and talking through ideas. Coaching angle: support building solo focus time so progress does not depend entirely on others being available.",
  },
  // Structure preference
  structured: {
    learner: "You do your best work when you know what is expected and have a clear plan to follow. Structure is not a crutch for you — it is what lets you move efficiently and well. That is a real strength, especially in work that rewards precision. As you grow, the edge is staying steady when a plan changes, since not every situation hands you the full map up front.",
    facilitator: "Structured lean: learner needs clear expectations and advance notice of change. Coaching angle: provide clear expectations, scaffold ambiguity, build practice tolerating incomplete plans.",
  },
  adaptive: {
    learner: "You do your best work with room to figure things out as you go. Open-ended situations that might unsettle others are where you do well. That adaptability is a real strength, especially in work that changes fast. As you grow, the edge is bringing enough structure to your own process that good ideas actually get finished.",
    facilitator: "Adaptive lean: learner works best with open-ended room. Coaching angle: add light structure to support follow-through and completion.",
  },
  // Contribution mode
  front_facing: {
    learner: "You gravitate toward visible roles — being the one who talks to people, presents the work, or is the point of contact. You are comfortable being seen, and that willingness is a real strength, since someone has to be the face and not everyone wants to. As you grow, the edge is making sure the work behind the visibility is as solid as the way you represent it.",
    facilitator: "Front-facing lean: comfortable with visibility and representation. Coaching angle: check that visible contribution is backed by substance; create accountability for the work behind the presentation.",
  },
  behind_the_scenes: {
    learner: "You gravitate toward building the work itself rather than being the face of it. You would rather make something solid and let it speak than stand in the spotlight. That is a real strength, and the visible stuff falls apart without it. As you grow, the edge is letting yourself be seen and credited for what you make, so your work does not go unnoticed.",
    facilitator: "Behind-the-scenes lean: builds the work, avoids spotlight. Coaching angle: ensure credit and visibility so they are not overlooked for advancement.",
  },
  // Pace
  quick_moving: {
    learner: "You tend to move fast, get a version done, and improve from there. You would rather keep things moving than wait for perfect. That momentum is a real strength, especially in work that rewards iteration. As you grow, the edge is knowing which moments call for slowing down and getting it exactly right the first time.",
    facilitator: "Quick-moving lean: iterates fast, comfortable with rough versions. Coaching angle: practice slowing down when accuracy or quality requires it; watch for sustainability strain in slow, heavily structured environments.",
  },
  methodical: {
    learner: "You work carefully and thoroughly, getting it right rather than rushing. You would rather take the time than redo it later. That care is a real strength, especially in work where mistakes are costly. As you grow, the edge is knowing when a rough first pass is enough to get moving, since not everything needs to be perfect before it is useful.",
    facilitator: "Methodical lean: careful, thorough, quality-focused. Coaching angle: practice first drafts and deadlines; watch for sustainability strain in fast, adaptive environments. This is the sustainability dimension — flag for coaching attention when pace and structure both oppose a track's profile.",
  },
};

// ─── Pathway orientation language ────────────────────────────────────────────

export type PathwayContent = { learner: string; facilitator: string };

export const PATHWAY_CONTENT: Record<PathwayOrientation, PathwayContent> = {
  ownership: {
    learner: "You are drawn to building and directing your own work. The idea of owning something and shaping how it turns out pulls at you more than slotting into something already built. That drive is a real strength, and it is where a lot of new things come from. A path that gives you room to build and lead, or to grow toward running your own thing, is worth taking seriously. Beyond Code Collective coaches and instructors can help you find the version of that which fits your life right now.",
    facilitator: "Ownership lean: high self-direction, lower stability-seeking. Learner energized by autonomy and building. Explore ownership paths, project leadership, building toward running their own work. Watch: high self-direction with low risk comfort means the path needs scaffolding and staged risk, not redirection away from ownership.",
  },
  placement: {
    learner: "You are drawn to doing strong work on solid ground. A reliable role where you can contribute and build a stable foundation matters to you more than the pull of running your own thing. That is a real strength, and it is wise, especially when you are building a foundation for the rest of your life. A path that offers a dependable role with room to grow is worth taking seriously, and Beyond Code Collective coaches and instructors can help you find one that fits.",
    facilitator: "Placement lean: high stability-seeking, lower self-direction. Learner energized by reliable contribution inside a structure. Explore stable tracks with clear growth paths. Important: never treat stability-seeking as a ceiling on capacity or as permanent — it is often shaped by real material conditions.",
  },
  blended: {
    learner: "You want two things at once — to build something of your own and to have solid ground under you. That is one of the most common and most human combinations there is, and it is not a contradiction. It often means the right path lets you build toward ownership in steps, with stability while you do, rather than leaping all at once. Beyond Code Collective coaches and instructors can help you map what that staged path could look like.",
    facilitator: "Blended: high self-direction and high stability-seeking. Learner wants to build and also needs solid ground. Staged pathway — ownership through incremental steps with stability support. This is a common and workable pattern.",
  },
  exploring: {
    learner: "Your answers do not point strongly toward one kind of path yet, and that is completely normal. It often means you are still figuring out what you want, which is exactly the right thing to be doing right now. There is no wrong result here. Beyond Code Collective coaches and instructors can help you try things on and notice what actually pulls at you as you go.",
    facilitator: "Still exploring: low self-direction and low stability-seeking. Do not force a direction. Use coaching, exposure, and small experiments. Connect with Module 1 archetype and Module 2 work style to surface more specific starting points.",
  },
};

// ─── Sustainability note (conditional — append when SDR high + RSK low) ───────

export const SUSTAINABILITY_NOTE =
  "One thing worth naming. You are drawn to building your own thing, and you also like knowing where you stand. That usually means the path that lasts for you is a steady, staged one — building toward what you want with support and solid ground along the way, rather than a sudden leap. That is not a smaller version of the goal. For most people it is the wiser route to it.";

// ─── Module 2 universal framing ──────────────────────────────────────────────

export const MODULE_2_FRAMING =
  "Module 2 looked at how you tend to work in real situations. There are no better or worse answers here, just different ways of getting things done.";

// ─── Module 3 universal framing ──────────────────────────────────────────────

export const MODULE_3_FRAMING =
  "Module 3 looked at what tends to keep you going and what kind of path might fit you right now. This is about what serves you at this point in your life, not a fixed verdict about who you are or what you are capable of.";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/assessment/content.ts
git commit -m "feat: add assessment content — all 49 questions and prewritten language blocks"
```

---

## Task 4: Scoring engine

**Files:**
- Create: `src/lib/assessment/scoring.ts`

Pure functions. No DB, no async, no imports from Next.js. Testable in isolation.

- [ ] **Step 1: Write the scoring file**

```ts
// src/lib/assessment/scoring.ts

import type { ArchetypeKey, ScoredOutput, RawResponses, ArchetypeConfidence, PathwayOrientation } from "./types";
import { MODULE_1_ITEMS, MODULE_2_SCENARIOS, MODULE_3_ITEMS } from "./content";

// ─── Module 1 ─────────────────────────────────────────────────────────────────

function scoreModule1(responses: RawResponses): Pick<ScoredOutput,
  "archetype_primary" | "archetype_secondary" | "archetype_is_blended" |
  "archetype_confidence" | "archetype_scores" | "facilitator_review"
> {
  const sums: Record<ArchetypeKey, { total: number; count: number }> = {
    navigator: { total: 0, count: 0 },
    developer: { total: 0, count: 0 },
    igniter: { total: 0, count: 0 },
    connector: { total: 0, count: 0 },
    systems_thinker: { total: 0, count: 0 },
    culture_keeper: { total: 0, count: 0 },
    designer: { total: 0, count: 0 },
    support_specialist: { total: 0, count: 0 },
    explorer: { total: 0, count: 0 },
  };

  for (const item of MODULE_1_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw === "number") {
      sums[item.archetype].total += raw;
      sums[item.archetype].count += 1;
    }
  }

  const averages = Object.fromEntries(
    Object.entries(sums).map(([k, v]) => [k, v.count > 0 ? v.total / v.count : 0])
  ) as Record<ArchetypeKey, number>;

  const sorted = (Object.entries(averages) as [ArchetypeKey, number][])
    .sort(([, a], [, b]) => b - a);

  const [primary, primaryScore] = sorted[0];
  const [secondary, secondaryScore] = sorted[1];
  const gap = primaryScore - secondaryScore;

  let facilitator_review = false;
  let confidence: ArchetypeConfidence;
  let archetype_secondary: ArchetypeKey | null = null;
  let archetype_is_blended = false;

  const aboveFour = sorted.filter(([, v]) => v >= 4.0).length;
  const allFlat = sorted.every(([, v]) => v >= 2.75 && v <= 3.50);
  const tieCount = sorted.filter(([, v]) => v === primaryScore).length;

  if (tieCount >= 4) {
    // Four or more tied — "still emerging"
    confidence = "flat";
    facilitator_review = true;
  } else if (tieCount === 3) {
    confidence = "flat";
    facilitator_review = true;
  } else if (tieCount === 2) {
    // Two-way tie — blended
    confidence = "blended";
    archetype_secondary = secondary;
    archetype_is_blended = true;
  } else if (aboveFour >= 5) {
    confidence = "broad_high";
    facilitator_review = true;
  } else if (allFlat) {
    confidence = "flat";
    facilitator_review = true;
  } else if (primaryScore < 3.25) {
    confidence = "low";
    facilitator_review = true;
  } else if (gap <= 0.25) {
    confidence = "blended";
    archetype_secondary = secondary;
    archetype_is_blended = true;
  } else if (primaryScore >= 4.0 && gap >= 0.50) {
    confidence = "high";
    if (gap <= 0.50) {
      archetype_secondary = secondary;
    }
  } else if (primaryScore >= 3.50 && gap > 0.25 && gap < 0.50) {
    confidence = "moderate";
    archetype_secondary = secondary;
  } else {
    confidence = "moderate";
    if (gap <= 0.50) archetype_secondary = secondary;
  }

  return {
    archetype_primary: primary,
    archetype_secondary,
    archetype_is_blended,
    archetype_confidence: confidence,
    archetype_scores: averages,
    facilitator_review,
  };
}

// ─── Module 2 ─────────────────────────────────────────────────────────────────

function scoreModule2(responses: RawResponses): Pick<ScoredOutput,
  "social_energy" | "social_energy_signal" |
  "structure_preference" | "structure_preference_signal" |
  "contribution_mode" | "contribution_mode_signal" |
  "pace" | "pace_signal" | "sustainability_risk"
> {
  const poles: Record<string, string[]> = {
    social_energy: [],
    structure_preference: [],
    contribution_mode: [],
    pace: [],
  };

  for (const scenario of MODULE_2_SCENARIOS) {
    const choice = responses[scenario.id];
    if (choice === "A") poles[scenario.optionA.dimension].push(scenario.optionA.pole);
    else if (choice === "B") poles[scenario.optionB.dimension].push(scenario.optionB.pole);
  }

  function tally(dimension: string): [string, "clear" | "lighter"] {
    const choices = poles[dimension];
    const counts: Record<string, number> = {};
    for (const p of choices) counts[p] = (counts[p] ?? 0) + 1;
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const winner = sorted[0][0];
    const signal = sorted[0][1] === 3 ? "clear" : "lighter";
    return [winner, signal];
  }

  const [social_energy, social_energy_signal] = tally("social_energy") as ["solo" | "collaborative", "clear" | "lighter"];
  const [structure_preference, structure_preference_signal] = tally("structure_preference") as ["structured" | "adaptive", "clear" | "lighter"];
  const [contribution_mode, contribution_mode_signal] = tally("contribution_mode") as ["front_facing" | "behind_the_scenes", "clear" | "lighter"];
  const [pace, pace_signal] = tally("pace") as ["quick_moving" | "methodical", "clear" | "lighter"];

  // Sustainability risk: 2+ dimensions opposing a strong signal
  // (simplified for MVP — just flag if methodical+structured or quick_moving+adaptive)
  const opposingCount = [
    pace === "methodical",
    structure_preference === "structured",
  ].filter(Boolean).length;
  const sustainability_risk = opposingCount >= 2;

  return {
    social_energy, social_energy_signal,
    structure_preference, structure_preference_signal,
    contribution_mode, contribution_mode_signal,
    pace, pace_signal,
    sustainability_risk,
  };
}

// ─── Module 3 ─────────────────────────────────────────────────────────────────

function scoreModule3(responses: RawResponses): Pick<ScoredOutput,
  "self_direction_avg" | "stability_seeking_avg" | "risk_comfort_avg" |
  "pathway_orientation" | "sustainability_note"
> {
  const dims: Record<string, number[]> = {
    self_direction: [],
    stability_seeking: [],
    risk_comfort: [],
  };

  for (const item of MODULE_3_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw === "number") {
      const score = item.reverse ? 6 - raw : raw;
      dims[item.dimension].push(score);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const self_direction_avg = avg(dims.self_direction);
  const stability_seeking_avg = avg(dims.stability_seeking);
  const risk_comfort_avg = avg(dims.risk_comfort);

  const highSDR = self_direction_avg >= 3.5;
  const highSTB = stability_seeking_avg >= 3.5;

  let pathway_orientation: PathwayOrientation;
  if (highSDR && !highSTB) pathway_orientation = "ownership";
  else if (!highSDR && highSTB) pathway_orientation = "placement";
  else if (highSDR && highSTB) pathway_orientation = "blended";
  else pathway_orientation = "exploring";

  const sustainability_note = highSDR && risk_comfort_avg < 3.0;

  return {
    self_direction_avg,
    stability_seeking_avg,
    risk_comfort_avg,
    pathway_orientation,
    sustainability_note,
  };
}

// ─── Combined scorer ──────────────────────────────────────────────────────────

export function scoreAssessment(responses: RawResponses): ScoredOutput {
  return {
    ...scoreModule1(responses),
    ...scoreModule2(responses),
    ...scoreModule3(responses),
  };
}
```

- [ ] **Step 2: Manually verify the scoring logic**

Open a Node REPL or browser console and run:
```ts
import { scoreAssessment } from "./src/lib/assessment/scoring";

// All Navigator responses (score 5), everything else 1, Module 2 all solo/structured/behind/methodical, Module 3 all high self-direction low stability
const testResponses = {
  "M1-NAV-01": 5, "M1-NAV-02": 5, "M1-NAV-03": 5,
  "M1-DEV-01": 1, "M1-DEV-02": 1, "M1-DEV-03": 1,
  "M1-IGN-01": 1, "M1-IGN-02": 1, "M1-IGN-03": 1,
  "M1-CON-01": 1, "M1-CON-02": 1, "M1-CON-03": 1,
  "M1-SYS-01": 1, "M1-SYS-02": 1, "M1-SYS-03": 1,
  "M1-CUL-01": 1, "M1-CUL-02": 1, "M1-CUL-03": 1,
  "M1-DES-01": 1, "M1-DES-02": 1, "M1-DES-03": 1,
  "M1-SUP-01": 1, "M1-SUP-02": 1, "M1-SUP-03": 1,
  "M1-EXP-01": 1, "M1-EXP-02": 1, "M1-EXP-03": 1,
  "M2-SOC-01": "A", "M2-SOC-02": "A", "M2-SOC-03": "B",
  "M2-STR-01": "B", "M2-STR-02": "A", "M2-STR-03": "A",
  "M2-CON-01": "B", "M2-CON-02": "B", "M2-CON-03": "A",
  "M2-PAC-01": "B", "M2-PAC-02": "B", "M2-PAC-03": "A",
  "M3-SDR-01": 5, "M3-SDR-02": 5, "M3-SDR-03": 5,
  "M3-STB-01": 1, "M3-STB-02": 1, "M3-STB-03": 1,
  "M3-RSK-01": 4, "M3-RSK-02": 4, "M3-RSK-03": 4, "M3-RSK-04": 2,
};

const result = scoreAssessment(testResponses);
// Expected: archetype_primary = "navigator", confidence = "high"
// pathway_orientation = "ownership", social_energy = "solo"
console.log(result);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/assessment/scoring.ts
git commit -m "feat: add assessment scoring engine"
```

---

## Task 5: Feature flag helper

**Files:**
- Create: `src/lib/assessment/features.ts`

- [ ] **Step 1: Write the features helper**

```ts
// src/lib/assessment/features.ts
import { createServiceClient } from "@/lib/supabase/server";

export async function isAssessmentEnabled(programSlug: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("program_features")
    .select("assessment_enabled")
    .eq("program_slug", programSlug)
    .maybeSingle();
  return data?.assessment_enabled ?? false;
}

export async function getProgramFeatures(programSlug: string) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("program_features")
    .select("*")
    .eq("program_slug", programSlug)
    .maybeSingle();
  return data ?? null;
}

export async function setAssessmentEnabled(programSlug: string, enabled: boolean) {
  const svc = createServiceClient();
  await svc
    .from("program_features")
    .upsert({ program_slug: programSlug, assessment_enabled: enabled, updated_at: new Date().toISOString() });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/assessment/features.ts
git commit -m "feat: add program feature flag helper for assessment"
```

---

## Task 6: Forced-choice component

**Files:**
- Modify: `src/components/survey-fields.tsx`

- [ ] **Step 1: Add the ForcedChoiceQuestion type and field**

In `src/components/survey-fields.tsx`, add after the last `export type` definition (before the `export type SurveyQuestion` union):

```ts
export type ForcedChoiceQuestion = {
  type: "forced-choice";
  id: string;
  scenario: string;
  optionA: { label: string; pole: string };
  optionB: { label: string; pole: string };
  required?: boolean;
};
```

Add `ForcedChoiceQuestion` to the `SurveyQuestion` union type.

Add a `ForcedChoiceField` component alongside the other field components:

```tsx
function ForcedChoiceField({
  question,
  value,
  onChange,
}: {
  question: ForcedChoiceQuestion;
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-medium text-ink leading-snug">{question.scenario}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["A", "B"] as const).map((letter) => {
          const opt = letter === "A" ? question.optionA : question.optionB;
          const selected = value === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onChange(letter)}
              className={`
                text-left rounded-xl border-2 px-4 py-4 text-sm leading-snug transition-all
                ${selected
                  ? "border-accent bg-accent/10 text-ink font-medium"
                  : "border-ink/10 bg-white hover:border-ink/30 text-ink/80"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

In the `QuestionRenderer` component's switch statement, add a case for `"forced-choice"`:

```tsx
case "forced-choice":
  return (
    <ForcedChoiceField
      question={q as ForcedChoiceQuestion}
      value={value as string | undefined}
      onChange={(v) => onChange(q.id, v)}
    />
  );
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fonz.morris/conductor/workspaces/bcc-academy-lxp/paris
pnpm tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/survey-fields.tsx
git commit -m "feat: add forced-choice question type to survey-fields"
```

---

## Task 7: Server actions

**Files:**
- Create: `src/app/dashboard/assessment/actions.ts`

- [ ] **Step 1: Write the actions file**

```ts
// src/app/dashboard/assessment/actions.ts
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scoreAssessment } from "@/lib/assessment/scoring";
import type { RawResponses } from "@/lib/assessment/types";

export async function saveAssessmentProgress(
  responses: RawResponses,
  currentModule: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const svc = createServiceClient();
  await svc.from("assessment_progress").upsert({
    student_id: user.id,
    current_module: currentModule,
    responses_so_far: responses,
    updated_at: new Date().toISOString(),
  });

  return { success: true };
}

export async function getAssessmentProgress() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data } = await svc
    .from("assessment_progress")
    .select("*")
    .eq("student_id", user.id)
    .maybeSingle();

  return data;
}

export async function submitAssessment(
  responses: RawResponses,
  programSlug: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Score synchronously — pure function, fast
  const scored_output = scoreAssessment(responses);

  const svc = createServiceClient();

  // Write results
  const { error } = await svc.from("assessment_results").insert({
    student_id: user.id,
    program_slug: programSlug,
    raw_responses: responses,
    scored_output,
    completed_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  // Clean up in-progress state
  await svc.from("assessment_progress").delete().eq("student_id", user.id);

  revalidatePath("/dashboard/assessment/results");
  return { success: true, scored_output };
}

export async function getAssessmentResult(studentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Only allow admins to view other students' results
  const targetId = studentId ?? user.id;
  if (studentId && studentId !== user.id) {
    const svc = createServiceClient();
    const { data: student } = await svc
      .from("students")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = student?.role;
    if (!role || !["admin", "instructor", "super_admin"].includes(role)) {
      throw new Error("Unauthorized");
    }
  }

  const svc = createServiceClient();
  const { data } = await svc
    .from("assessment_results")
    .select("*")
    .eq("student_id", targetId)
    .maybeSingle();

  return data;
}

export async function markAssessmentViewed(studentId: string) {
  const svc = createServiceClient();
  await svc
    .from("assessment_results")
    .update({ facilitator_viewed_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .is("facilitator_viewed_at", null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/assessment/actions.ts
git commit -m "feat: add assessment server actions (save progress, submit, results)"
```

---

## Task 8: Assessment wizard

**Files:**
- Create: `src/app/dashboard/assessment/page.tsx`
- Create: `src/app/dashboard/assessment/assessment-wizard.tsx`

- [ ] **Step 1: Write the server page**

```tsx
// src/app/dashboard/assessment/page.tsx
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { AssessmentWizard } from "./assessment-wizard";
import { getAssessmentProgress } from "./actions";

export default async function AssessmentPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const svc = createServiceClient();

  // Already completed → go to results
  const { data: existing } = await svc
    .from("assessment_results")
    .select("id")
    .eq("student_id", ctx.userId)
    .maybeSingle();
  if (existing) redirect("/dashboard/assessment/results");

  // Resume in-progress if any
  const progress = await getAssessmentProgress();
  const programSlug = ctx.student?.cohorts
    ? "catalyst" // TODO: derive from program context in a follow-up
    : "catalyst";

  return (
    <div className="min-h-screen bg-paper">
      <AssessmentWizard
        initialModule={progress?.current_module ?? 1}
        initialResponses={progress?.responses_so_far ?? {}}
        programSlug={programSlug}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write the client wizard**

```tsx
// src/app/dashboard/assessment/assessment-wizard.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MODULE_1_ITEMS, MODULE_2_SCENARIOS, MODULE_3_ITEMS, TRANSITION_MESSAGES } from "@/lib/assessment/content";
import { saveAssessmentProgress, submitAssessment } from "./actions";
import type { RawResponses } from "@/lib/assessment/types";

type WizardStage = "m1a" | "m1b" | "m2" | "m3" | "transitioning" | "submitting";

const STAGE_ORDER: WizardStage[] = ["m1a", "m1b", "m2", "m3"];

export function AssessmentWizard({
  initialModule,
  initialResponses,
  programSlug,
}: {
  initialModule: number;
  initialResponses: RawResponses;
  programSlug: string;
}) {
  const router = useRouter();
  const [responses, setResponses] = useState<RawResponses>(initialResponses);
  const [stage, setStage] = useState<WizardStage>(() => {
    if (initialModule <= 1) return "m1a";
    if (initialModule === 2) return "m1b";
    if (initialModule === 3) return "m2";
    return "m3";
  });
  const [transitionMsg, setTransitionMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setResponse = useCallback((id: string, value: number | string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  }, []);

  // Items for current stage
  const m1aItems = MODULE_1_ITEMS.slice(0, 14);
  const m1bItems = MODULE_1_ITEMS.slice(14);
  const currentItems =
    stage === "m1a" ? m1aItems :
    stage === "m1b" ? m1bItems :
    stage === "m2" ? MODULE_2_SCENARIOS :
    MODULE_3_ITEMS;

  const isStageComplete = () => {
    if (stage === "m1a") return m1aItems.every(i => responses[i.id] != null);
    if (stage === "m1b") return m1bItems.every(i => responses[i.id] != null);
    if (stage === "m2") return MODULE_2_SCENARIOS.every(s => responses[s.id] != null);
    if (stage === "m3") return MODULE_3_ITEMS.every(i => responses[i.id] != null);
    return false;
  };

  const moduleLabel = stage === "m1a" || stage === "m1b" ? "1" : stage === "m2" ? "2" : "3";

  const advance = async () => {
    if (stage === "m1a") {
      await saveAssessmentProgress(responses, 1);
      setTransitionMsg(TRANSITION_MESSAGES.afterM1A);
      setStage("transitioning");
      setTimeout(() => setStage("m1b"), 1800);
    } else if (stage === "m1b") {
      await saveAssessmentProgress(responses, 2);
      setTransitionMsg(TRANSITION_MESSAGES.afterM1B);
      setStage("transitioning");
      setTimeout(() => setStage("m2"), 1800);
    } else if (stage === "m2") {
      await saveAssessmentProgress(responses, 3);
      setTransitionMsg(TRANSITION_MESSAGES.afterM2);
      setStage("transitioning");
      setTimeout(() => setStage("m3"), 1800);
    } else if (stage === "m3") {
      setTransitionMsg(TRANSITION_MESSAGES.afterM3);
      setStage("transitioning");
      setIsSubmitting(true);
      try {
        await submitAssessment(responses, programSlug);
        router.push("/dashboard/assessment/results");
      } catch (e) {
        setError("Something went wrong saving your results. Please try again.");
        setIsSubmitting(false);
        setStage("m3");
      }
    }
  };

  if (stage === "transitioning") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-ink/60 text-sm font-medium">{transitionMsg}</p>
          {isSubmitting && (
            <div className="flex justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
          Module {moduleLabel} of 3
        </p>
        <h1 className="text-xl font-semibold text-ink">
          {stage === "m1a" || stage === "m1b"
            ? "How you tend to show up"
            : stage === "m2"
            ? "How you tend to work"
            : "What drives you"}
        </h1>
        {stage === "m2" && (
          <p className="text-sm text-ink/60">For each situation, pick the response that fits you best. There are no right or wrong answers.</p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {(stage === "m1a" || stage === "m1b") && m1aItems.concat(m1bItems).filter((_, i) =>
          stage === "m1a" ? i < 14 : i >= 14
        ).map((item) => (
          <LikertRow
            key={item.id}
            id={item.id}
            text={item.text}
            value={responses[item.id] as number | undefined}
            onChange={(v) => setResponse(item.id, v)}
          />
        ))}

        {stage === "m2" && MODULE_2_SCENARIOS.map((scenario) => (
          <ForcedChoiceRow
            key={scenario.id}
            scenario={scenario}
            value={responses[scenario.id] as string | undefined}
            onChange={(v) => setResponse(scenario.id, v)}
          />
        ))}

        {stage === "m3" && MODULE_3_ITEMS.map((item) => (
          <LikertRow
            key={item.id}
            id={item.id}
            text={item.text}
            value={responses[item.id] as number | undefined}
            onChange={(v) => setResponse(item.id, v)}
          />
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Next button */}
      <button
        onClick={advance}
        disabled={!isStageComplete()}
        className="w-full rounded-xl bg-accent text-white font-semibold py-3.5 text-sm transition-opacity disabled:opacity-40"
      >
        {stage === "m3" ? "See my results" : "Continue"}
      </button>
    </div>
  );
}

// ─── Likert row ───────────────────────────────────────────────────────────────

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

function LikertRow({
  id, text, value, onChange,
}: {
  id: string;
  text: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink leading-snug">{text}</p>
      <div className="flex gap-2">
        {LIKERT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 rounded-lg border-2 py-2.5 text-xs font-medium transition-all
              ${value === opt.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-ink/10 text-ink/50 hover:border-ink/30"
              }
            `}
          >
            {opt.value}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink/40 px-0.5">
        <span>Strongly disagree</span>
        <span>Strongly agree</span>
      </div>
    </div>
  );
}

// ─── Forced choice row ────────────────────────────────────────────────────────

function ForcedChoiceRow({
  scenario, value, onChange,
}: {
  scenario: typeof MODULE_2_SCENARIOS[number];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink leading-snug">{scenario.scenario}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["A", "B"] as const).map((letter) => {
          const opt = letter === "A" ? scenario.optionA : scenario.optionB;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onChange(letter)}
              className={`
                text-left rounded-xl border-2 px-4 py-4 text-sm leading-snug transition-all
                ${value === letter
                  ? "border-accent bg-accent/10 text-ink font-medium"
                  : "border-ink/10 bg-white hover:border-ink/30 text-ink/70"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/assessment/page.tsx src/app/dashboard/assessment/assessment-wizard.tsx
git commit -m "feat: add assessment wizard — 3-module multi-step form"
```

---

## Task 9: Learner results profile

**Files:**
- Create: `src/app/dashboard/assessment/results/page.tsx`
- Create: `src/app/dashboard/assessment/results/results-profile.tsx`

- [ ] **Step 1: Write the server page**

```tsx
// src/app/dashboard/assessment/results/page.tsx
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getAssessmentResult } from "../actions";
import { ResultsProfile } from "./results-profile";

export default async function ResultsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const result = await getAssessmentResult();
  if (!result) redirect("/dashboard/assessment");

  return (
    <div className="min-h-screen bg-paper">
      <ResultsProfile result={result.scored_output} />
    </div>
  );
}
```

- [ ] **Step 2: Write the results profile component**

```tsx
// src/app/dashboard/assessment/results/results-profile.tsx
"use client";

import { useState } from "react";
import type { ScoredOutput } from "@/lib/assessment/types";
import {
  ARCHETYPE_CONTENT,
  WORK_STYLE_CONTENT,
  PATHWAY_CONTENT,
  SPECIAL_CASE_LANGUAGE,
  SUSTAINABILITY_NOTE,
  MODULE_2_FRAMING,
  MODULE_3_FRAMING,
} from "@/lib/assessment/content";

export function ResultsProfile({ result }: { result: ScoredOutput }) {
  const [openSection, setOpenSection] = useState<string | null>("archetype");

  const archetypeContent = ARCHETYPE_CONTENT[result.archetype_primary];
  const secondaryContent = result.archetype_secondary
    ? ARCHETYPE_CONTENT[result.archetype_secondary]
    : null;

  const showArchetypeNarrative =
    result.archetype_confidence !== "low" &&
    result.archetype_confidence !== "flat" &&
    result.archetype_confidence !== "broad_high";

  const archetypeSummaryText = (() => {
    if (result.archetype_confidence === "low") return SPECIAL_CASE_LANGUAGE.low_confidence;
    if (result.archetype_confidence === "broad_high") return SPECIAL_CASE_LANGUAGE.broad_high;
    if (result.archetype_confidence === "flat") return SPECIAL_CASE_LANGUAGE.flat;
    if (result.archetype_is_blended && secondaryContent) {
      return `Your profile shows a blended pattern: ${archetypeContent.name} and ${secondaryContent.name}.`;
    }
    return archetypeContent.definition;
  })();

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Your Pathway Profile
        </p>
        <h1 className="text-2xl font-bold text-ink">
          {showArchetypeNarrative ? archetypeContent.name : "Your Profile"}
        </h1>
        <p className="text-ink/70 leading-relaxed">{archetypeSummaryText}</p>
      </div>

      {/* Section 1 — How you show up */}
      <Section
        id="archetype"
        title="How you show up"
        isOpen={openSection === "archetype"}
        onToggle={() => setOpenSection(openSection === "archetype" ? null : "archetype")}
      >
        {showArchetypeNarrative ? (
          <div className="space-y-4">
            <p className="text-ink/80 leading-relaxed">{archetypeContent.learner}</p>
            {result.archetype_is_blended && secondaryContent && (
              <>
                <hr className="border-ink/10" />
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                  {secondaryContent.name}
                </p>
                <p className="text-ink/80 leading-relaxed">{secondaryContent.learner}</p>
              </>
            )}
          </div>
        ) : (
          <p className="text-ink/70 leading-relaxed">{archetypeSummaryText}</p>
        )}
      </Section>

      {/* Section 2 — How you tend to work */}
      <Section
        id="workstyle"
        title="How you tend to work"
        isOpen={openSection === "workstyle"}
        onToggle={() => setOpenSection(openSection === "workstyle" ? null : "workstyle")}
      >
        <div className="space-y-6">
          <p className="text-xs text-ink/50 italic">{MODULE_2_FRAMING}</p>
          {[
            { label: "Energy", pole: result.social_energy, signal: result.social_energy_signal },
            { label: "Structure", pole: result.structure_preference, signal: result.structure_preference_signal },
            { label: "Contribution", pole: result.contribution_mode, signal: result.contribution_mode_signal },
            { label: "Pace", pole: result.pace, signal: result.pace_signal },
          ].map(({ label, pole, signal }) => {
            const content = WORK_STYLE_CONTENT[pole];
            const poleName = pole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</span>
                  <span className="text-xs text-accent font-medium">{poleName}</span>
                  {signal === "lighter" && (
                    <span className="text-[10px] text-ink/30 italic">lighter lean</span>
                  )}
                </div>
                <p className="text-sm text-ink/75 leading-relaxed">{content.learner}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Section 3 — What drives you */}
      <Section
        id="pathway"
        title="What drives you"
        isOpen={openSection === "pathway"}
        onToggle={() => setOpenSection(openSection === "pathway" ? null : "pathway")}
      >
        <div className="space-y-4">
          <p className="text-xs text-ink/50 italic">{MODULE_3_FRAMING}</p>
          <p className="text-ink/80 leading-relaxed">
            {PATHWAY_CONTENT[result.pathway_orientation].learner}
          </p>
          {result.sustainability_note && (
            <div className="rounded-xl bg-ink/5 px-4 py-4">
              <p className="text-sm text-ink/70 leading-relaxed">{SUSTAINABILITY_NOTE}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Closing */}
      <p className="text-xs text-ink/40 italic text-center pt-4">
        {SPECIAL_CASE_LANGUAGE.closing}
      </p>
    </div>
  );
}

function Section({
  id, title, isOpen, onToggle, children,
}: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink/[0.02] transition-colors"
      >
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-ink/30 text-sm">{isOpen ? "↑" : "↓"}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-6 pt-2 border-t border-ink/10">
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/assessment/results/
git commit -m "feat: add learner assessment results profile page"
```

---

## Task 10: Admin facilitator views

**Files:**
- Create: `src/app/dashboard/admin/assessments/page.tsx`
- Create: `src/app/dashboard/admin/assessments/[studentId]/page.tsx`

- [ ] **Step 1: Write the admin list page**

```tsx
// src/app/dashboard/admin/assessments/page.tsx
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import Link from "next/link";
import type { ScoredOutput } from "@/lib/assessment/types";
import { ARCHETYPE_CONTENT, PATHWAY_CONTENT } from "@/lib/assessment/content";

export default async function AssessmentsAdminPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canAccessAdminPanel(ctx.student?.role ?? "")) redirect("/dashboard");

  const svc = createServiceClient();

  const { data: rows } = await svc
    .from("assessment_results")
    .select("student_id, completed_at, scored_output, facilitator_viewed_at")
    .order("completed_at", { ascending: false });

  const studentIds = (rows ?? []).map((r) => r.student_id as string);
  const { data: students } = studentIds.length > 0
    ? await svc
        .from("students")
        .select("id, first_name, last_name, email")
        .in("id", studentIds)
    : { data: [] };

  const studentMap = new Map(
    (students ?? []).map((s) => [s.id as string, s as { id: string; first_name: string; last_name: string; email: string }])
  );

  const unviewedCount = (rows ?? []).filter((r) => !r.facilitator_viewed_at).length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Pathway Assessments</h1>
          <p className="text-sm text-ink/50 mt-0.5">Learner pathway profiles</p>
        </div>
        {unviewedCount > 0 && (
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
            {unviewedCount} new
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-ink/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02]">
              <th className="text-left px-4 py-3 font-semibold text-ink/60 text-xs uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-3 font-semibold text-ink/60 text-xs uppercase tracking-wide">Archetype</th>
              <th className="text-left px-4 py-3 font-semibold text-ink/60 text-xs uppercase tracking-wide">Pathway</th>
              <th className="text-left px-4 py-3 font-semibold text-ink/60 text-xs uppercase tracking-wide">Completed</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => {
              const student = studentMap.get(row.student_id as string);
              const scored = row.scored_output as ScoredOutput;
              const archetype = ARCHETYPE_CONTENT[scored.archetype_primary];
              const pathway = PATHWAY_CONTENT[scored.pathway_orientation];
              const isNew = !row.facilitator_viewed_at;
              const completedDate = new Date(row.completed_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

              return (
                <tr key={row.student_id as string} className="border-b border-ink/5 hover:bg-ink/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/admin/assessments/${row.student_id}`} className="group flex items-center gap-2">
                      {isNew && <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />}
                      <span className="font-medium text-ink group-hover:text-accent transition-colors">
                        {student ? `${student.first_name} ${student.last_name}` : "Unknown"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{archetype.name}</td>
                  <td className="px-4 py-3 text-ink/70 capitalize">{scored.pathway_orientation}</td>
                  <td className="px-4 py-3 text-ink/50">{completedDate}</td>
                </tr>
              );
            })}
            {!rows?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink/40 text-sm">
                  No assessments completed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the facilitator detail page**

```tsx
// src/app/dashboard/admin/assessments/[studentId]/page.tsx
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { markAssessmentViewed } from "../../actions";  // Note: this needs to be the assessment actions
import type { ScoredOutput } from "@/lib/assessment/types";
import {
  ARCHETYPE_CONTENT,
  WORK_STYLE_CONTENT,
  PATHWAY_CONTENT,
  SPECIAL_CASE_LANGUAGE,
} from "@/lib/assessment/content";
import Link from "next/link";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canAccessAdminPanel(ctx.student?.role ?? "")) redirect("/dashboard");

  const svc = createServiceClient();

  const { data: result } = await svc
    .from("assessment_results")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!result) redirect("/dashboard/admin/assessments");

  // Mark as viewed
  if (!result.facilitator_viewed_at) {
    await svc
      .from("assessment_results")
      .update({ facilitator_viewed_at: new Date().toISOString() })
      .eq("student_id", studentId);
  }

  const { data: student } = await svc
    .from("students")
    .select("first_name, last_name, email")
    .eq("id", studentId)
    .maybeSingle();

  const scored = result.scored_output as ScoredOutput;
  const archetype = ARCHETYPE_CONTENT[scored.archetype_primary];
  const secondary = scored.archetype_secondary
    ? ARCHETYPE_CONTENT[scored.archetype_secondary]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/assessments" className="text-sm text-ink/40 hover:text-ink transition-colors">
          ← Assessments
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink">
          {student ? `${student.first_name} ${student.last_name}` : "Student"}
        </h1>
        <p className="text-sm text-ink/50">{student?.email}</p>
      </div>

      {/* Module 1 — Archetype */}
      <FacilitatorSection title="Module 1 — Archetype Identity">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-ink">{archetype.name}</span>
            <ConfidenceBadge confidence={scored.archetype_confidence} />
            {scored.facilitator_review && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">
                Review recommended
              </span>
            )}
          </div>
          {scored.archetype_is_blended && secondary && (
            <p className="text-sm text-ink/60">Blended with: <strong>{secondary.name}</strong></p>
          )}
          <p className="text-sm text-ink/70 leading-relaxed">{archetype.facilitator}</p>
          {secondary && scored.archetype_is_blended && (
            <p className="text-sm text-ink/70 leading-relaxed mt-2">{secondary.facilitator}</p>
          )}

          {/* Score table */}
          <details className="mt-3">
            <summary className="text-xs text-ink/40 cursor-pointer hover:text-ink/60 transition-colors">
              Show score breakdown
            </summary>
            <div className="mt-2 space-y-1">
              {(Object.entries(scored.archetype_scores) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([key, avg]) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="w-36 text-ink/60 capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex-1 bg-ink/5 rounded-full h-1.5">
                      <div
                        className="bg-accent rounded-full h-1.5 transition-all"
                        style={{ width: `${((avg - 1) / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-ink/40 w-8 text-right">{avg.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </details>
        </div>
      </FacilitatorSection>

      {/* Module 2 — Work Style */}
      <FacilitatorSection title="Module 2 — Work Style">
        <div className="space-y-4">
          {[
            { label: "Social energy", pole: scored.social_energy, signal: scored.social_energy_signal },
            { label: "Structure", pole: scored.structure_preference, signal: scored.structure_preference_signal },
            { label: "Contribution", pole: scored.contribution_mode, signal: scored.contribution_mode_signal },
            { label: "Pace", pole: scored.pace, signal: scored.pace_signal },
          ].map(({ label, pole, signal }) => {
            const content = WORK_STYLE_CONTENT[pole];
            const poleName = pole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</span>
                  <span className="text-xs font-medium text-accent">{poleName}</span>
                  <span className="text-[10px] text-ink/30">{signal === "clear" ? "3–0" : "2–1"}</span>
                </div>
                <p className="text-sm text-ink/70 leading-relaxed">{content.facilitator}</p>
              </div>
            );
          })}
          {scored.sustainability_risk && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Sustainability flag</p>
              <p className="text-xs text-amber-700">Two or more work-style dimensions may create strain in a fast, unstructured track. Plan support before placement confirmation.</p>
            </div>
          )}
        </div>
      </FacilitatorSection>

      {/* Module 3 — Motivation */}
      <FacilitatorSection title="Module 3 — Motivation and Pathway">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Self-direction", value: scored.self_direction_avg },
              { label: "Stability-seeking", value: scored.stability_seeking_avg },
              { label: "Risk comfort", value: scored.risk_comfort_avg },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-ink/10 px-3 py-3 text-center">
                <p className="text-lg font-bold text-ink">{value.toFixed(2)}</p>
                <p className="text-[10px] text-ink/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-1">Pathway orientation</p>
            <p className="font-medium text-ink capitalize mb-1">{scored.pathway_orientation}</p>
            <p className="text-sm text-ink/70 leading-relaxed">{PATHWAY_CONTENT[scored.pathway_orientation].facilitator}</p>
          </div>
          {scored.sustainability_note && (
            <div className="rounded-xl bg-ink/5 px-4 py-3">
              <p className="text-xs text-ink/50 leading-relaxed">High self-direction with lower risk comfort — this learner wants to build but may strain under sustained uncertainty. Plan scaffolding and a staged path.</p>
            </div>
          )}
        </div>
      </FacilitatorSection>
    </div>
  );
}

function FacilitatorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-ink/10 bg-ink/[0.02]">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ScoredOutput["archetype_confidence"] }) {
  const labels: Record<string, string> = {
    high: "High confidence",
    moderate: "Moderate confidence",
    blended: "Blended",
    low: "Low confidence",
    broad_high: "Broad high",
    flat: "Flat pattern",
  };
  const colors: Record<string, string> = {
    high: "bg-green-100 text-green-800",
    moderate: "bg-blue-100 text-blue-800",
    blended: "bg-purple-100 text-purple-800",
    low: "bg-amber-100 text-amber-800",
    broad_high: "bg-amber-100 text-amber-800",
    flat: "bg-ink/10 text-ink/60",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}
```

Note: update the import path for `markAssessmentViewed` — it should come from `@/app/dashboard/assessment/actions`, not a relative path in the admin folder.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/assessments/
git commit -m "feat: add admin assessment list and facilitator detail views"
```

---

## Task 11: Wire the onboarding prompt + admin home badge

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx` (add unviewed count query)
- Add prompt at `/dashboard` (or `/dashboard/help`) for incomplete assessment

- [ ] **Step 1: Add the assessment prompt to the learner dashboard**

In `src/app/dashboard/page.tsx` (or wherever the main dashboard home renders), add after the auth check:

```tsx
// After session check — check if assessment is needed
import { isAssessmentEnabled } from "@/lib/assessment/features";
import { createServiceClient } from "@/lib/supabase/server";

const programSlug = program.slug;
const assessmentEnabled = await isAssessmentEnabled(programSlug);

let assessmentCompleted = false;
if (assessmentEnabled) {
  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("assessment_results")
    .select("id")
    .eq("student_id", ctx.userId)
    .maybeSingle();
  assessmentCompleted = !!existing;
}
```

Then in the JSX, above the main content:

```tsx
{assessmentEnabled && !assessmentCompleted && (
  <div className="rounded-2xl bg-accent/10 border border-accent/20 px-5 py-4 flex items-center justify-between gap-4">
    <div>
      <p className="font-semibold text-ink text-sm">Complete your pathway profile</p>
      <p className="text-xs text-ink/60 mt-0.5">Takes about 10–15 minutes. Helps us give you better support.</p>
    </div>
    <a
      href="/dashboard/assessment"
      className="flex-shrink-0 rounded-xl bg-accent text-white text-sm font-semibold px-4 py-2"
    >
      Start
    </a>
  </div>
)}
```

- [ ] **Step 2: Add unviewed badge to admin home**

In `src/app/dashboard/admin/page.tsx`, add a query for unviewed assessments and pass the count to `AdminTabs` (or render it directly in the admin home tab).

Find the `isDashboardlessProgram` block and add:

```tsx
// Count unviewed assessments for the badge
const { count: unviewedAssessments } = await svc
  .from("assessment_results")
  .select("*", { count: "exact", head: true })
  .is("facilitator_viewed_at", null);
```

Then surface this in the admin home tab or sidebar as a badge next to "Assessments".

- [ ] **Step 3: Add Assessments link to admin navigation**

In `src/app/dashboard/admin/admin-tabs.tsx` (or wherever admin nav links are defined), add an "Assessments" entry pointing to `/dashboard/admin/assessments`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire assessment onboarding prompt and admin home badge"
```

---

## Task 12: Type-check and smoke test

- [ ] **Step 1: Run TypeScript compiler**

```bash
cd /Users/fonz.morris/conductor/workspaces/bcc-academy-lxp/paris
pnpm tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

- [ ] **Step 2: Start dev server and test the flow**

```bash
pnpm dev
```

1. Open `http://localhost:3000/dashboard/assessment`
2. Walk through all 49 questions — confirm Likert buttons respond, forced-choice cards select, transitions fire at the right moments
3. Submit and confirm redirect to `/dashboard/assessment/results`
4. Verify results profile renders archetype name, work-style sections, and pathway section
5. Open `http://localhost:3000/dashboard/admin/assessments` — confirm the completed row appears with a "New" dot
6. Click into the student row — confirm the facilitator detail view renders score table, coaching notes, and flags

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: learner pathway assessment MVP — wizard, scoring, results, admin view"
```
