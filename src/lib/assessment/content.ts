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
  emoji: string;
  definition: string;
  learner: string;
  facilitator: string;
};

export const ARCHETYPE_CONTENT: Record<ArchetypeKey, ArchetypeContent> = {
  navigator: {
    name: "Navigator",
    emoji: "🧭",
    definition: "Orients toward direction and purpose. Wants to understand where something is headed and why before acting, and keeps the goal in view when others lose it in the details.",
    learner: "You want to understand the point of something before you dive in. You think about where things are headed, not just what is in front of you, and you tend to hold onto the goal when other people get lost in the details. That sense of direction is genuinely useful. As you grow, the edge is acting before everything is fully clear, because the world rarely hands you the whole map first. Your instinct for purpose is a strong place to build from.",
    facilitator: "Leads with purpose and direction. Engages best when the why and the destination are clear, and can stall on work that feels pointless. Strength: big-picture orientation, keeping the goal in view. Growth edge: tolerating ambiguity, starting before the picture is complete. Cross-module: a Navigator who is also methodical and structured will especially want clarity up front; an adaptive one moves more easily. Coaching angle: connect tasks to the larger purpose, and practice taking first steps with incomplete information.",
  },
  developer: {
    name: "Developer",
    emoji: "🛠️",
    definition: "Turns ideas into real, working things. Motivated by hands-on building, fixing, and visible progress on something they are making.",
    learner: "You like making things real. Ideas are fine, but you come alive when you can build, fix, or get your hands on something and watch it work. Seeing something you made come together is what keeps you going. That drive to produce is a real asset, especially in tech, where so much of the work is building. As you grow, the edge is stepping back to ask why and for whom before you build, so your skill goes toward what matters most.",
    facilitator: "Motivated by tangible output. Thrives with projects and prototypes, loses energy in long abstract discussion. Strength: making ideas real, persistence through building. Growth edge: pausing to weigh purpose and user before constructing. Cross-module: high Module 3 self-direction leans toward building their own thing; high stability-seeking prefers building inside an established team. Coaching angle: give them something to make early, tied to a clear purpose so they do not optimize the wrong thing well.",
  },
  igniter: {
    name: "Igniter",
    emoji: "🔥",
    definition: "Provides activation energy. Starts things, takes the first step, and moves ideas from talk into action, even before the plan is fully formed.",
    learner: "You get things moving. When a group is stuck talking, you are the one who actually starts. You are willing to take the first step before everything is figured out, and that momentum is something a lot of people lack. Groups need it. As you grow, the edge is pairing your fast start with follow-through, so the things you kick off also get finished well.",
    facilitator: "Brings initiative and momentum, comfortable starting before conditions are perfect. Strength: activation, bias toward action. Growth edge: follow-through past the exciting start. Cross-module: keep Igniter (starting) separate from Module 2 pace (speed); an Igniter can be methodical once underway. High initiative with low Module 3 risk comfort can mean someone who starts boldly but strains under sustained uncertainty. Coaching angle: channel the starting energy, then build structure that supports finishing.",
  },
  connector: {
    name: "Connector",
    emoji: "🤝",
    definition: "Bridges separate people, ideas, and resources. Notices useful links others miss and helps different parties understand each other.",
    learner: "You see connections other people miss. You notice when two people, or two ideas, should be linked, and you often make that link happen. When people are talking past each other, you are the one who helps them actually understand. That bridging instinct is rare and valuable, in tech and everywhere. As you grow, the edge is protecting time for your own focused work, because connectors can give so much to others that their own projects keep waiting.",
    facilitator: "Thinks in links and relationships across people, ideas, and resources. A natural bridge and translator. Strength: communication across difference, spotting useful links. Growth edge: protecting their own focus, not over-extending into everyone's needs. Cross-module: keep Connector (identity) separate from Module 2 social energy (work preference); a Connector can still prefer solo work. Coaching angle: use the bridging in real roles, and watch that they do not become the unpaid glue who never advances their own goals.",
  },
  systems_thinker: {
    name: "Systems Thinker",
    emoji: "⚙️",
    definition: "Looks for patterns, causes, and structure. Wants to understand how parts fit and what is really driving a problem before choosing a solution.",
    learner: "You want to understand how things actually work. You look for the patterns and the real causes behind a problem instead of reacting to the surface, and before you pick a solution you want to know what is really going on underneath. That depth is a serious strength, especially in technical work, where the obvious answer is often the wrong one. As you grow, the edge is knowing when you have analyzed enough and it is time to decide and move.",
    facilitator: "Analyzes structure and causation, strong at root-cause work. Strength: analytical depth, pattern recognition, getting past symptoms. Growth edge: analysis paralysis, knowing when understanding is enough. Cross-module: a Systems Thinker who is also methodical especially needs permission to stop analyzing and decide. Coaching angle: value the depth, give clear decision points so analysis converts to action.",
  },
  culture_keeper: {
    name: "Culture Keeper",
    emoji: "🌱",
    definition: "Tends the emotional climate of a group. Notices shifts in mood and energy, helps people feel included, and steadies a group when things get tense.",
    learner: "You feel the temperature of a room. You notice when the mood in a group shifts, often before anyone says anything, and you do small things to help people feel included and to keep things steady when they get tense. That care for how a group feels is a real strength, and it is the kind of thing that makes teams actually work. As you grow, the edge is tending to your own needs too, not only everyone else's, so the care you give does not run you empty.",
    facilitator: "Attends to group climate, belonging, and morale, senses mood shifts early. Strength: emotional awareness, inclusion, group stability. Growth edge: boundaries and self-care, since they often carry the group's emotional load. Cross-module: distinguish Culture Keeper (tending the collective) from Support Specialist (helping an individual) and from Module 2 social energy (preferring group work). Coaching angle: name and value the emotional labor explicitly, help them set boundaries so they do not absorb everyone's stress.",
  },
  designer: {
    name: "Designer",
    emoji: "🎨",
    definition: "Shapes how things look, feel, and work for the person using them. Notices when something is confusing or hard to use and makes it clearer and more pleasant.",
    learner: "You notice when something is clunky, confusing, or hard to use, and it bothers you in a way it does not bother most people. You like shaping how a thing looks, feels, and works for whoever is on the other end of it. That eye for the experience is a genuine strength, and it is exactly what good design and good technology depend on. As you grow, the edge is balancing making something good with getting it in front of people, because real feedback beats endless polishing.",
    facilitator: "Focuses on usability and the craft of how a thing works for its user, notices friction and wants to fix it. Strength: user empathy, attention to experience, quality of craft. Growth edge: perfectionism, knowing when good enough is enough to ship and learn. Cross-module: separate Designer (shaping the artifact) from Connector (bridging people) and Developer (building function); a methodical Designer especially tends toward over-polishing. Coaching angle: protect the craft, give deadlines and real users so polishing becomes iteration.",
  },
  support_specialist: {
    name: "Support Specialist",
    emoji: "🛡️",
    definition: "Helps a person get unstuck. Patient one-on-one troubleshooting, breaking things into steps, and steadying someone who is struggling.",
    learner: "You are the person others come to when they are stuck. You stay patient while someone works through something hard, and you have a way of breaking a confusing thing into small steps until it finally makes sense to them. Helping someone go from lost to capable is something you do well, and probably do often. That is a real strength, and it is the heart of a lot of good technical work. As you grow, the edge is pursuing your own learning and goals too, not only helping everyone else reach theirs.",
    facilitator: "Excels at one-on-one help, troubleshooting, and patient explanation, meeting a struggling person where they are. Strength: patience, breaking down complexity, steadying others. Growth edge: advancing their own goals, avoiding being typecast purely as helper. Cross-module: distinguish Support (helping one person) from Connector (linking many) and Culture Keeper (tending the group). Coaching angle: value the helping, and actively create space for their own advancement so the strength does not cap their growth.",
  },
  explorer: {
    name: "Explorer",
    emoji: "🗺️",
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
