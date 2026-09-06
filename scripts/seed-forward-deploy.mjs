// Seed (or refresh) the Forward Deploy: The FDE Program track as a DB-driven,
// self-paced course with weekly office hours. Idempotent: re-running updates
// the track, the 13 sessions, and the instructor lesson bodies in place.
//
//   node scripts/seed-forward-deploy.mjs --program catalyst --start 2026-09-16 \
//        [--time 12:00] [--source /path/to/forward-deploy-course] [--meeting <zoom url>]
//
// --start is the first Wednesday office hour (YYYY-MM-DD). Five weekly office
// hours follow; week 5 is demo day. --time is Eastern, 24h. --source defaults to
// the public course repo on GitHub, so the platform never needs the course
// checked out locally.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}
function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const PROGRAM_SLUG = arg("program", "catalyst");
const START = arg("start", null);
const TIME = arg("time", "12:00");
const SOURCE = arg("source", "https://raw.githubusercontent.com/youngfonz/course-builder/main/forward-deploy-course");
const MEETING = arg("meeting", null);
const TRACK = "forward-deploy";
if (!START || !/^\d{4}-\d{2}-\d{2}$/.test(START)) {
  console.error("--start YYYY-MM-DD is required (first Wednesday office hour)");
  process.exit(1);
}

async function readSource(file) {
  if (SOURCE.startsWith("http")) {
    const res = await fetch(`${SOURCE}/${file}`);
    if (!res.ok) throw new Error(`fetch ${file}: ${res.status}`);
    return res.text();
  }
  const p = join(SOURCE, file);
  if (!existsSync(p)) throw new Error(`missing ${p}`);
  return readFileSync(p, "utf8");
}

// ── Course content ─────────────────────────────────────────────────────────
// Internal week N = Session N-1. Week 1 is the setup unit and renders by label
// ("Setup"), so numbered sessions read 1..12 to the learner.
const SESSIONS = [
  { title: "Get Set Up (and Keep the Data Safe)", label: "Setup", icon: "🔧",
    desc: "Install the tools, accept the data rule, and meet your instructor.",
    objectives: ["Have the instructor open and answering", "Accept the data rule", "Name the one workflow you'll build on"] },
  { title: "Works vs. Lands", icon: "🎯",
    desc: "41 of 11,000: why software that works perfectly still gets routed around.",
    objectives: ["Tell the difference between making it work and making it land", "Name a tool your organisation bought that people route around", "Read a real usage report and say what it means"] },
  { title: "What an FDE Is (and the Four Things It Isn't)", icon: "🧭",
    desc: "Sort six job adverts and find the one whose unit of success is a deployment.",
    objectives: ["Explain an FDE in one lift-ready sentence", "Tell an FDE from a sales engineer, consultant, support and product engineer", "Decide whether the trade-offs suit you"] },
  { title: "Discovery: The Real Process, Not the Wiki Version", icon: "👀",
    desc: "Pull the last ten instances, classify what broke, then sit with the person who does it.",
    objectives: ["Classify the last 10–20 instances and do rough maths", "Run a four-question discovery conversation without interrupting", "Find the unwritten, load-bearing rules"] },
  { title: "Reading Someone Else's Data", icon: "🗂️",
    desc: "A 2009 spreadsheet with cryptic columns, three date formats and a sibling flagged as a duplicate.",
    objectives: ["Read a schema you didn't design", "List the ways real data is inconsistent", "Build on the mess instead of proposing a migration"] },
  { title: "Decide Where Intelligence Belongs", icon: "⚖️",
    desc: "Triage the wishlist. Find the smallest build that moves the most work with the least authority.",
    objectives: ["Rank requests by time saved, authority handed over, and migration required", "Kill a quarter-eating requirement credibly", "Write what the agent must never do on its own"] },
  { title: "One Model, One Platform: The Agent Loop", icon: "🔁",
    desc: "Email in, decision, row out. Ugly, and it works, by Friday.",
    objectives: ["Direct the build of an agent that takes a real input and produces a real output", "Describe the loop as input → decision → output", "Give the agent only the data it needs"] },
  { title: "Give It the Veteran's Rules", icon: "📜",
    desc: "Write down the rules that lived in one head and ground the agent in them.",
    objectives: ["Ground decisions in the customer's own rules document", "Read a REASON column and trace it to a rule", "Explain why auditable beats learned-from-examples for anything with a name on it"] },
  { title: "Make It Survive Failure", icon: "🛡️",
    desc: "Twenty ways it breaks. Fix, fence or escalate every one. Add the audit log.",
    objectives: ["List twenty failure modes for a real inbox", "Choose fix, fence or escalate for each", "Make every decision logged and reversible"] },
  { title: "Make It Measurable", icon: "📊",
    desc: "Fifty eval cases from real examples. The failures are the deliverable.",
    objectives: ["Build an eval from real, not invented, cases", "Investigate every failure instead of celebrating the pass rate", "State the result in hours, errors or days"] },
  { title: "Ship It and Carry the Number", icon: "🚀",
    desc: "The IT conversation, then one to three colleagues using it while you watch.",
    objectives: ["Ask the five questions whoever owns your systems needs answered", "Put it in real hands and don't touch the keyboard", "Run the five-deaths check honestly"] },
  { title: "Defend It Like a VP", icon: "🎤",
    desc: "One page, five minutes, through the unhappy paths. Make the sponsor look brilliant.",
    objectives: ["Write the one-pager: broken workflow, what you built, what changed, the number", "Demo through at least two failures", "Answer the three hardest questions"] },
  { title: "Capstone: Publish, Demo, Hand Over", icon: "🏁",
    desc: "Publish the writeup, deliver the demo, hand it over. Score against the rubric.",
    objectives: ["Publish the writeup", "Deliver the demo to the cohort", "Hand over so someone else can run it"] },
];

// Split LESSONS.md into one body per session ("## Session N — Title" headers).
function splitLessons(md) {
  const parts = md.split(/\n(?=## Session \d+ — )/);
  const out = new Map();
  for (const p of parts) {
    const m = p.match(/^## Session (\d+) — /);
    if (m) out.set(Number(m[1]), p.trim());
  }
  return out;
}

// Wednesdays: START must be a Wednesday; we don't silently move it.
function officeHours(startIso, time, meeting) {
  const d0 = new Date(`${startIso}T12:00:00Z`);
  if (d0.getUTCDay() !== 3) {
    console.error(`--start ${startIso} is not a Wednesday. Office hours are Wednesdays; pick the first one.`);
    process.exit(1);
  }
  const titles = [
    "Office hours · Week 1: name your workflow",
    "Office hours · Week 2: where does intelligence belong?",
    "Office hours · Week 3: show one unhappy path",
    "Office hours · Week 4: read out your number",
    "Demo day · five minutes each, through the unhappy paths",
  ];
  return titles.map((title, i) => {
    const d = new Date(d0); d.setUTCDate(d0.getUTCDate() + 7 * i);
    return {
      date: d.toISOString().slice(0, 10),
      time: `${time} ET`,
      title,
      description: i === 4
        ? "Bring your deployment, your one-pager, and whoever is using it. Scored with the rubric, sponsor in the room."
        : "45 minutes. Two minutes each on the question in the title, then unblocking. Flags the instructor raised this week are the agenda.",
      ...(meeting ? { joinUrl: meeting } : {}),
    };
  });
}

// ── Seed ───────────────────────────────────────────────────────────────────
const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: program, error: pErr } = await svc.from("programs").select("id, slug").eq("slug", PROGRAM_SLUG).single();
if (pErr || !program) throw new Error(`program ${PROGRAM_SLUG} not found: ${pErr?.message ?? ""}`);

const lessonsMd = await readSource("LESSONS.md");
const lessons = splitLessons(lessonsMd);
if (lessons.size !== SESSIONS.length) throw new Error(`expected ${SESSIONS.length} lessons, parsed ${lessons.size}`);

const weekSummaries = SESSIONS.map((s, i) => ({
  week: i + 1,
  topic: s.title,
  icon: s.icon,
  ...(s.label ? { label: s.label } : {}),
}));

const trackRow = {
  program_id: program.id,
  track_slug: TRACK,
  name: "Forward Deploy: The FDE Program",
  short_name: "Forward Deploy",
  description:
    "Do the Forward Deployed Engineer job on one real workflow in your own organisation: understand the business reality, decide where AI belongs, direct the build (you never write code), make it survive failure, measure it, ship it to a colleague, and defend it to a director.\n\nThirteen hands-on sessions with an AI instructor, weekly office hours with a human, and a demo day. Any industry. Built on the Forward Deploy series by Fonz Morris.",
  instructor: "Fonz Morris",
  start_date: START,
  total_weeks: SESSIONS.length,
  sessions_per_week: 1,
  unit_label: "Session",
  session_times: ["Self-paced, about an hour per session", `Office hours Wednesdays ${TIME} ET`],
  week_summaries: weekSummaries,
  phase: "core",
  self_paced: true,
  sequential_gating: false,
  submissions_enabled: false,
  reflections_enabled: true,
  default_reflection_prompts: [
    "What did you predict, and what actually happened?",
    "One line for MY_DEPLOYMENT: how does this session apply to your workflow?",
  ],
  office_hours: officeHours(START, TIME, MEETING),
  updated_at: new Date().toISOString(),
};

const { error: tErr } = await svc.from("track_overrides").upsert(trackRow, { onConflict: "program_id,track_slug" });
if (tErr) throw tErr;
console.log(`track_overrides: ${TRACK} in ${PROGRAM_SLUG} (${program.id})`);

const contentRows = SESSIONS.map((s, i) => ({
  track: TRACK,
  program_id: program.id,
  week_number: i + 1,
  status: "upcoming",
  status_2: "upcoming",
  title: s.title,
  subtitle: i === 0 ? "Before Session 1" : `Session ${i}`,
  description: s.desc,
  objectives: s.objectives,
  updated_at: new Date().toISOString(),
}));
const { error: cErr } = await svc.from("session_content").upsert(contentRows, { onConflict: "track,week_number" });
if (cErr) throw cErr;
console.log(`session_content: ${contentRows.length} rows`);

const lessonRows = SESSIONS.map((_, i) => ({
  program_id: program.id,
  track: TRACK,
  week_number: i + 1,
  body_md: lessons.get(i),
  source_url: SOURCE.startsWith("http") ? `${SOURCE}/LESSONS.md` : null,
  updated_at: new Date().toISOString(),
}));
const { error: lErr } = await svc.from("session_lessons").upsert(lessonRows, { onConflict: "track,week_number" });
if (lErr) throw lErr;
console.log(`session_lessons: ${lessonRows.length} rows`);
console.log(`\nOpen: /dashboard/track/${TRACK}`);
