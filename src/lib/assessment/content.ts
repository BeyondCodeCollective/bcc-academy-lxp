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

// ─── Module 1: Archetype identity (v0.4 — 27 items, 9 archetypes × 3) ──────────
// Source: LPAT delivery package v0.4. Three items per archetype. Reverse scoring
// is a per-item flag (M1-EXP-03), not a special case in the scoring function.
// Items display in randomized order.

export type M1Item = { id: string; text: string; archetype: ArchetypeKey; reverse?: boolean };

export const MODULE_1_ITEMS: M1Item[] = [
  // Navigator
  { id: "M1-NAV-01", text: "I like understanding the bigger purpose before I start working on something.", archetype: "navigator" },
  { id: "M1-NAV-02", text: "I often think about where a project or idea is headed.", archetype: "navigator" },
  { id: "M1-NAV-03", text: "When a project gets complicated, I stay focused on the bigger goal instead of getting lost in the details.", archetype: "navigator" },
  // Developer
  { id: "M1-DEV-01", text: "I like turning ideas into something real that people can use, test, or improve.", archetype: "developer" },
  { id: "M1-DEV-02", text: "I enjoy hands-on tasks, building something, fixing something, or putting the pieces together myself.", archetype: "developer" },
  { id: "M1-DEV-03", text: "I feel motivated when I can see something I am building or fixing come together.", archetype: "developer" },
  // Igniter
  { id: "M1-IGN-01", text: "When something needs to get started, I am usually willing to take the first step.", archetype: "igniter" },
  { id: "M1-IGN-02", text: "I like helping ideas move from talking into action.", archetype: "igniter" },
  { id: "M1-IGN-03", text: "I don't wait to be asked before jumping in and getting something started.", archetype: "igniter" },
  // Connector
  { id: "M1-CON-01", text: "I tend to spot useful connections between people, ideas, or resources before anyone else points them out.", archetype: "connector" },
  { id: "M1-CON-02", text: "When I see two people or ideas that should connect, I often help make that link happen.", archetype: "connector" },
  { id: "M1-CON-03", text: "When people are describing the same idea in different words and missing each other, I can usually translate so it clicks for both sides.", archetype: "connector" },
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
  { id: "M1-DES-02", text: "When something is confusing or hard to use, I want to fix it, not just work around it.", archetype: "designer" },
  { id: "M1-DES-03", text: "I enjoy shaping how something looks, feels, sounds, or works for the person using it.", archetype: "designer" },
  // Support Specialist
  { id: "M1-SUP-01", text: "I usually stay patient when I am helping someone work through a problem.", archetype: "support_specialist" },
  { id: "M1-SUP-02", text: "I like helping someone feel less stuck, confused, or overwhelmed.", archetype: "support_specialist" },
  { id: "M1-SUP-03", text: "When I explain something, I often break it into small steps so it is easier to follow.", archetype: "support_specialist" },
  // Explorer
  { id: "M1-EXP-01", text: "I like trying different options before deciding what direction fits me best.", archetype: "explorer" },
  { id: "M1-EXP-02", text: "I learn a lot by trying things out and asking questions.", archetype: "explorer" },
  { id: "M1-EXP-03", text: "Sticking with one plan for a long time before trying something else feels comfortable to me.", archetype: "explorer", reverse: true },
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
    optionA: { label: "Being the face of it, the one who talks to people and represents the work.", pole: "front_facing", dimension: "contribution_mode" },
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
    optionB: { label: "Being the person others come to with questions, the point of contact.", pole: "front_facing", dimension: "contribution_mode" },
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
  /** Short tagline shown under the result header. */
  definition: string;
  /** "Your strengths" — the learner-facing strengths paragraph. */
  strengths: string;
  /** Career pathways by stage. Stages are NOT ages — a career changer can
      enter laterally. */
  pathways?: { entry: string; mid: string; established: string };
  /** "Future thinking" — where the pattern is headed as AI reshapes work. */
  future?: string;
  /** "The honest part" — no-overclaiming note in learner voice. */
  honest?: string;
  /** Facilitator/coaching note (admin view only). */
  facilitator: string;
};

export const ARCHETYPE_CONTENT: Record<ArchetypeKey, ArchetypeContent> = {
  navigator: {
    name: "Navigator",
    emoji: "🧭",
    definition: "You keep the work pointed at the right goal.",
    strengths: "You are the person who asks what we are actually trying to do here, and that question saves teams more time and money than almost any other skill. You notice when a group is drifting, when effort is going toward the wrong target, and when a plan changed but the goal got lost. You hold the destination in your head while everyone else is in the details. At a family party, you are the one who remembers it is grandma's birthday, not a club night. On a tech team, you are the one who catches the team building something nobody asked for.",
    pathways: {
      entry: "Project coordinator, program coordinator, junior business analyst, product operations associate, scrum team roles. These are the jobs where someone tracks scope, timelines, and what is actually being delivered.",
      mid: "Project manager, scrum master, business analyst, product owner, program manager. Certifications like CAPM, PMP, and CSM are real, recognized steps on this road.",
      established: "Product manager, senior program manager, portfolio and strategy roles, PMO leadership. Product management is the purest Navigator job in tech.",
    },
    future: `As AI does more of the building, the person who keeps asking "is this the right thing to build" becomes more valuable, not less. AI product roles, AI implementation coordination, and product operations are growing fields that need exactly this pattern.`,
    honest: "People are rarely hired directly into a product or project management role. The Navigator pattern shows up inside a first role. The coordinator who flags scope drift is the one who gets pulled toward bigger rooms. Your job in your first role is to let this strength show.",
    facilitator: "Leads with purpose and direction. Engages best when the why and the destination are clear, and can stall on work that feels pointless. Strength: big-picture orientation, keeping the goal in view. Growth edge: tolerating ambiguity, starting before the picture is complete. Cross-module: a Navigator who is also methodical and structured will especially want clarity up front; an adaptive one moves more easily. Coaching angle: connect tasks to the larger purpose, and practice taking first steps with incomplete information.",
  },
  developer: {
    name: "Developer",
    emoji: "🛠️",
    definition: "You turn ideas into working things.",
    strengths: "You make things real. While others are still talking, you have a rough version on the table that everyone can react to. You fix what is broken, you test what is uncertain, and you are willing to take something apart and rebuild it when it does not work. That willingness to start over is rarer than people think. At home you are the one who fixes the thing instead of waiting for someone else. On a team you are the reason the idea became an actual product.",
    pathways: {
      entry: "Junior developer, QA tester, IT support technician, web development assistant, automation assistant, low-code and no-code builder roles. These are the jobs where someone builds, tests, and fixes.",
      mid: "Software developer, QA engineer, automation engineer, DevOps roles, systems administrator.",
      established: "Senior engineer, technical lead, software architect, engineering manager.",
    },
    future: "AI is making builders faster, not unnecessary. AI-assisted development, automation building, and AI integration work all still need someone with the builder's judgment: knowing when something actually works, when it is good enough to ship, and when it needs to be torn down and redone. The tools change. The pattern does not.",
    honest: "First builds are rarely impressive, and that is the point. Developers grow by shipping small things that work and stacking them. Every senior engineer started with something humble that functioned.",
    facilitator: "Motivated by tangible output. Thrives with projects and prototypes, loses energy in long abstract discussion. Strength: making ideas real, persistence through building. Growth edge: pausing to weigh purpose and user before constructing. Cross-module: high Module 3 self-direction leans toward building their own thing; high stability-seeking prefers building inside an established team. Coaching angle: give them something to make early, tied to a clear purpose so they do not optimize the wrong thing well.",
  },
  systems_thinker: {
    name: "Systems Thinker",
    emoji: "⚙️",
    definition: "You find the real cause, not just the quick fix.",
    strengths: "You see how the parts affect each other. When the same problem keeps coming back, you are the one who figures out what keeps causing it instead of patching it every time. You are willing to slow a group down to find the truth, and that patience prevents the expensive repeat failures that quick fixes create. At a party you are the one who knows that if dinner is at 7 and the cake takes 2 hours, someone has to start by 4. On a tech team, you are the one who finds why it broke, not just that it broke.",
    pathways: {
      entry: "Junior data analyst, QA analyst, security operations analyst, network operations roles, technical support with a troubleshooting focus.",
      mid: "Systems analyst, cybersecurity analyst, data analyst, network engineer, process improvement roles.",
      established: "Security architect, systems architect, data architect, operations leadership.",
    },
    future: "The more complex systems get, the more valuable the person who understands how the pieces interact. AI oversight, AI security, and roles that analyze how automated systems behave are built for this pattern. Someone has to understand what the machine is actually doing and why. That someone thinks like you.",
    honest: "Early roles will sometimes reward speed over depth, and that can feel like the job is fighting your instincts. It is not. Teams learn fast who actually understands the system, and that person becomes hard to replace.",
    facilitator: "Analyzes structure and causation, strong at root-cause work. Strength: analytical depth, pattern recognition, getting past symptoms. Growth edge: analysis paralysis, knowing when understanding is enough. Cross-module: a Systems Thinker who is also methodical especially needs permission to stop analyzing and decide. Coaching angle: value the depth, give clear decision points so analysis converts to action.",
  },
  designer: {
    name: "Designer/Creator",
    emoji: "🎨",
    definition: "You make ideas land.",
    strengths: "You turn ideas into something people can understand and feel: a story, a visual, an example, a video, a presentation, a message. When a group has something complicated to share, you are the one who shapes it so it actually connects. And you share what you make even when you are nervous about how people will react, which is a form of courage most people never build. The work you have been doing for free your whole life, making things that move people, is work companies pay for.",
    pathways: {
      entry: "Content coordinator, social media coordinator, junior content designer, marketing assistant, media production assistant.",
      mid: "Content designer, technical writer, UX writer, instructional designer, digital media producer, brand and content strategist.",
      established: "Creative director, content strategy lead, head of product education, developer relations lead.",
    },
    future: "AI can generate content, but it cannot decide what an audience needs to feel, and it cannot give work a real voice. The people who direct AI media tools, who shape product storytelling, and who make new technology understandable to regular people are the next generation of this pathway. Every AI company on earth currently struggles to explain itself. That is a Designer/Creator job opening.",
    honest: `Creative paths can start scrappy, and early roles may not carry the word "creative" in the title. The pattern shows up anyway: the assistant whose deck everyone borrows, the coordinator whose posts perform. Make things, share them, and let the work introduce you.`,
    facilitator: "Focuses on usability and the craft of how a thing works for its user, notices friction and wants to fix it. Strength: user empathy, attention to experience, quality of craft. Growth edge: perfectionism, knowing when good enough is enough to ship and learn. Cross-module: separate Designer/Creator (shaping the artifact) from Connector (bridging people) and Developer (building function); a methodical one especially tends toward over-polishing. Coaching angle: protect the craft, give deadlines and real users so polishing becomes iteration.",
  },
  connector: {
    name: "Connector",
    emoji: "🤝",
    definition: "You link the people, ideas, and resources that need each other.",
    strengths: "You know who can help, and you actually make the introduction. When two people are talking past each other, you put what each one means into words the other can hear. You reach across groups even when it is awkward to be the one reaching, and that social courage is what makes networks real instead of theoretical. At a party you are the reason the two friend groups merged instead of splitting the room. At work you are the reason the client and the dev team finally understood each other.",
    pathways: {
      entry: "Customer success associate, community coordinator, sales development representative, partnerships assistant, recruiting coordinator.",
      mid: "Customer success manager, community manager, partnerships manager, account manager, technical recruiter.",
      established: "Director of partnerships, head of community, business development leadership, customer success leadership.",
    },
    future: "As AI handles more routine communication, the human work of trust, translation, and relationship grows in value. Companies rolling out new technology need people who can stand between the technical world and the human one and make both sides feel understood. AI adoption, partnership ecosystems, and community-driven growth are all Connector territory.",
    honest: "Connector value can be invisible on a resume because the result shows up in other people's wins. Learn to tell the story of what your connections produced. The introduction that saved a deal is your work. Claim it.",
    facilitator: "Thinks in links and relationships across people, ideas, and resources. A natural bridge and translator. Strength: communication across difference, spotting useful links. Growth edge: protecting their own focus, not over-extending into everyone's needs. Cross-module: keep Connector (identity) separate from Module 2 social energy (work preference); a Connector can still prefer solo work. Coaching angle: use the bridging in real roles, and watch that they do not become the unpaid glue who never advances their own goals.",
  },
  support_specialist: {
    name: "Support Specialist",
    emoji: "🛟",
    definition: "You get people unstuck.",
    strengths: "You stay patient when someone is confused, and you break big problems into steps small enough to actually take. You will sit with someone until they get it, even when it would be faster to do it for them, and that restraint is the difference between helping someone once and teaching them forever. In your family you are the one who walks people through their phone or computer without making them feel small. On a team you are the one people are not afraid to ask.",
    pathways: {
      entry: "Help desk technician, IT support specialist, customer support specialist, technical support roles. These are also among the most reliable doors into all of tech.",
      mid: "Support engineer, implementation and onboarding specialist, training specialist, IT administrator, solutions support.",
      established: "Support team lead, solutions engineer, customer experience leadership, head of training and enablement.",
    },
    future: "Every new technology creates a wave of confused humans, and AI is the biggest wave yet. The people who help others actually use these tools, who sit between powerful technology and the person staring at it, are going to be needed everywhere. Patience plus technical fluency is about to be one of the most employable combinations in the economy.",
    honest: `Support roles are sometimes talked about as "just" a starting point. Ignore that. They are where you learn how technology fails real people, and that knowledge powers every senior role on this pathway. Some of the best engineers, trainers, and leaders in tech started by answering the phone.`,
    facilitator: "Excels at one-on-one help, troubleshooting, and patient explanation, meeting a struggling person where they are. Strength: patience, breaking down complexity, steadying others. Growth edge: advancing their own goals, avoiding being typecast purely as helper. Cross-module: distinguish Support (helping one person) from Connector (linking many) and Guardian (tending the whole group). Coaching angle: value the helping, and actively create space for their own advancement so the strength does not cap their growth.",
  },
  culture_keeper: {
    name: "Culture Keeper",
    emoji: "🤝",
    definition: "You notice how a group is doing and help people feel included.",
    strengths: "Your responses point to noticing how a group is doing, not only what the group is doing. That may look like inviting a quiet person into the conversation or easing tension so people can keep working. Both can help a team feel included. In your next group task, name one support you need as well as one support you offer. Which version of this pattern shows up most often for you?",
    facilitator: "Attends to group climate, belonging, and morale, senses mood shifts early. Strength: emotional awareness, inclusion, group stability. Growth edge: boundaries and self-care, since they often carry the group's emotional load. Cross-module: distinguish Culture Keeper (tending the collective) from Support Specialist (helping an individual) and from Module 2 social energy (preferring group work). Coaching angle: name and value the emotional labor explicitly, help them set boundaries so they do not absorb everyone's stress.",
  },
  igniter: {
    name: "Igniter",
    emoji: "⚡",
    definition: "You start things and move ideas into action.",
    strengths: "You may start a task when a group has been waiting to begin. That can create useful momentum when a project needs a first move. What would help this start become a finished piece of work? Write the next checkpoint before you begin, then return to it after your first burst of work.",
    facilitator: "Brings initiative and momentum, comfortable starting before conditions are perfect. Strength: activation, bias toward action. Growth edge: follow-through past the exciting start. Cross-module: keep Igniter (starting) separate from Module 2 pace (speed); an Igniter can be methodical once underway. High initiative with low Module 3 risk comfort can mean someone who starts boldly but strains under sustained uncertainty. Coaching angle: channel the starting energy, then build structure that supports finishing.",
  },
  explorer: {
    name: "Explorer",
    emoji: "🔭",
    definition: "You learn by trying things and keeping your options open.",
    strengths: "Your answers suggest that you often learn by testing ideas, asking questions, and comparing options. This can help when a team needs fresh information before choosing a direction. In your next project, pick one option to test for a set amount of time before you switch to another. Notice what you learn once you stay with it beyond the first try. Another archetype may show up elsewhere.",
    facilitator: "Curious, keeps options open, learns through experimentation, resists premature commitment. Strength: adaptability, breadth, willingness to try. Growth edge: committing and going deep rather than staying at the surface across many things. Cross-module: a flat or blended Module 1 result is common and consistent with a genuine Explorer, so do not over-pathologize it; pair with Module 3 to see what they are reaching toward. Coaching angle: honor the exploration phase, help them set a project or time boundary to practice depth without feeling trapped.",
  },
};

// ─── Low-confidence / special-case learner language ──────────────────────────

// Opportunity-framed blocks for profiles without a single clear lean. None use
// numeric, "low confidence", or facilitator-flag language — those stay in the
// facilitator-facing materials.
export const SPECIAL_CASE_LANGUAGE = {
  // Broad strengths — high across many archetypes.
  broad_high: "Your responses show strengths across many areas, and that is worth saying plainly: you bring range. People with range adapt to new situations, pick things up across domains, and often end up in roles that touch many parts of a team. Range is also a real hiring advantage in smaller companies and growing teams, where one person wears several hats. The opportunity in front of you is focus: not because you lack direction, but because you get to choose where to point all of this first. Beyond Code Collective coaches and instructors will help you pick a starting lane, knowing you have more than one available.",
  // Blended profile — two strengths close together.
  blended: "Your results show a blended strengths pattern. More than one strength describes how you contribute, and the combination is the interesting part. Many of the best roles in tech live exactly where two patterns meet: the builder who can explain, the connector who understands systems, the navigator who keeps people whole. As you move through the program, notice which one shows up first when things get real. That is information, and your blend is a feature, not a tie to break.",
  // Still taking shape — flat or low pattern (shared copy).
  low_confidence: "Your strengths are still taking shape, and here is the part that matters: that is normal, especially when you are stepping into a new environment, and it usually means your strongest patterns have not had their stage yet. Plenty of people discover what they are best at by doing new and challenging work, not by reflecting on the past, and that is exactly what this program is. You are not behind. You are at the part of the story where it gets discovered. Beyond Code Collective coaches and instructors will be watching for what shows up and will help you name it when it does.",
  flat: "Your strengths are still taking shape, and here is the part that matters: that is normal, especially when you are stepping into a new environment, and it usually means your strongest patterns have not had their stage yet. Plenty of people discover what they are best at by doing new and challenging work, not by reflecting on the past, and that is exactly what this program is. You are not behind. You are at the part of the story where it gets discovered. Beyond Code Collective coaches and instructors will be watching for what shows up and will help you name it when it does.",
  // Balancing real life with possibility — universal closing for every result.
  closing: "Whatever your results show today, two things are true at once. First, your life right now is real: your responsibilities, your finances, your timing all matter, and no profile gets to ignore them. Second, this profile is a snapshot, not a ceiling. It describes how you contribute today so you and the people supporting you can make smart next moves, starting from your real life and pointed at what is possible from here.",
};

// ─── Work style language ──────────────────────────────────────────────────────
// Source: LPAT delivery package v0.4, Part 4. Learner text is per pole; the
// facilitator text is per axis. The "balanced" blocks are kept as optional
// future display language and are not rendered (v0.4: report the leaned pole).

export type WorkStyleContent = { learner: string };

export const WORK_STYLE_CONTENT: Record<string, WorkStyleContent> = {
  solo: { learner: "You lean toward having some space to work on your own. This may help you focus, think through a problem, and make progress without many interruptions. When a task needs shared context, add a brief update for the team. In your next project, tell a teammate what you are working on and the one question you have. That widens your options without changing your preference." },
  collaborative: { learner: "At your best, you use conversation to shape ideas and keep work moving with other people. This can help when a group needs quick feedback or a shared plan. Under pressure, a full schedule of discussion can leave little room to sort your own thinking. After your next team meeting, spend ten quiet minutes writing your next step before you join another conversation." },
  structured: { learner: "You lean toward clear plans, known expectations, and steps you can follow. This may help you organize work and catch details when a project has precise needs. When plans change, add one flexible step: identify what remains true and what needs a new plan. Use that check the next time a task shifts. It can help you keep your footing while the work changes." },
  adaptive: { learner: "You may recognize yourself in making a path while the situation is still taking shape. In a team, that can contribute useful options when a plan changes or little is known at the start. You are more likely to use it well when the goal and deadline are visible. At the start of your next open task, write one sentence that names the outcome you are aiming for." },
  front_facing: { learner: "At your best, you may speak with clients, present an idea, or serve as a point of contact for a project. This can help when work needs a clear voice and people need updates. Under pressure, the visible part of the work can take attention away from the details behind it. Before you present next time, check one piece of evidence that supports your message." },
  behind_the_scenes: { learner: "You lean toward building, testing, or improving the work itself rather than being its public voice. This may help a project become solid and reliable. When teammates need to understand what you made, add a simple explanation of your process. In your next project, share one progress note that names what changed and why. That lets others use and recognize the work." },
  quick_moving: { learner: "You lean toward getting a version moving, learning from it, and improving from there. This may help when a team needs momentum or early feedback. When mistakes would be costly, add a brief quality check before you share the work. For your next draft, pause to test one key detail against the project goal. You still get to move forward while protecting the important part." },
  methodical: { learner: "At your best, you may take time to check details and make a careful version of the work. This can help when accuracy matters and a mistake would create more work later. Under pressure, careful review can delay useful feedback from others. Share one early draft before it feels complete, then use the response to guide your next check." },
};

export type WorkStyleAxis = "social_energy" | "structure_preference" | "contribution_mode" | "pace";

export const WORK_STYLE_BALANCED: Record<WorkStyleAxis, string> = {
  social_energy: "Your answers suggest that you can move between solo focus and shared work, depending on the task. This can help when a project needs both careful preparation and active teamwork. In your next project, choose the work mode before you begin: work alone to draft, or meet with others to decide. Notice which choice helps the task move forward. Both approaches remain useful.",
  structure_preference: "You lean toward using a clear plan in some tasks and adjusting as you learn more in others. This may help you respond to what the work needs instead of using one approach each time. When the goal is unclear, add a short plan before you begin. List the first two steps, then revise them when new information appears. Both structure and flexibility can support good work.",
  contribution_mode: "Your answers suggest that you can contribute in a visible role or through the work behind the scenes. This can help a project when its needs change from building to sharing. In your next project, choose one role on purpose before the work begins. Ask whether the team needs someone to explain the work or someone to develop it. Notice how that choice affects the group.",
  pace: "You lean toward speeding up or slowing down based on what the work needs. This may help when a project has both quick tasks and careful tasks. When you start a new assignment, add one pace decision: decide which part needs a fast first version and which part needs a close check. Use that choice to plan your time. Both speed and care can be valuable.",
};

export const WORK_STYLE_FACILITATOR: Record<WorkStyleAxis, string> = {
  social_energy: "Reports where the learner does their best work, solo, collaborative, or flexibly between. Not a measure of whether they are social. Coaching angle: match early tasks to their mode where possible, then stretch the other mode gently. A strong solo lean may need deliberate inclusion in group work; a strong collaborative lean may need support building solo focus. Keep separate from Module 1 Connector, which is about seeing links, not preferring company.",
  structure_preference: "Reports preference for defined process versus open-ended room. Coaching angle: a structured learner needs clear expectations and advance notice of change, and benefits from practice tolerating ambiguity; an adaptive learner needs room and benefits from light structure to ensure follow-through. Pair with pace, since structured plus methodical especially wants clarity up front.",
  contribution_mode: "Reports preference for visible roles versus behind-the-scenes building. Both essential. Coaching angle: give front-facing learners visible roles but check the substance underneath; make sure behind-the-scenes learners get credit and visibility so they are not overlooked for advancement. Will correlate with some Module 1 archetypes, which is expected. The useful thing to surface is a mismatch, such as a front-facing identity with a behind-the-scenes work style.",
  pace: "Reports work tempo, quick and iterative versus careful and thorough. This is the sustainability dimension. Critical guardrail: a pace mismatch with a track informs support, never exclusion. A methodical learner in a fast track is supported with pacing strategies and early check-ins, not steered away, and a quick-moving learner in a slow, heavily-structured environment can strain too, through boredom and friction. When pace and structure both oppose a track's profile, flag it as higher sustainability risk needing coaching attention before placement, never as a reason to block placement.",
};

// ─── Pathway orientation language ────────────────────────────────────────────
// Source: LPAT delivery package v0.4, Part 5.

export type PathwayContent = { learner: string };

export const PATHWAY_CONTENT: Record<PathwayOrientation, PathwayContent> = {
  ownership: { learner: "Right now, you lean toward having room to shape and direct work you care about. This is a direction to explore, not a decision you have to make. You may find that in building something of your own or in taking ownership inside a team. Compare options by asking, “Where could I make choices and learn from the results?” Look for real examples in projects, roles, and conversations." },
  placement: { learner: "Your answers point to wanting a role where you can contribute, learn, and build a foundation right now. That may mean joining a team with clear work and feedback, or choosing a role with room to develop over time. Both are valid ways to explore a placement path. Ask, “What support and learning would this role give me?” Compare job details and stories from people doing similar work." },
  blended: { learner: "Right now, you lean toward exploring both ownership and placement. This is a direction to explore, not a choice you have to settle today. A blended path may include building your own project while learning within a team, or taking a role that lets you lead parts of the work. Ask, “What mix gives me room to contribute and the support I need?” Look for examples you can test." },
  exploring: { learner: "You may recognize yourself in keeping options open while you learn what matters to you right now. In your pathway search, that can contribute better information before you make a choice. You are more likely to learn from this stage when you can compare real work, not only titles. This week, talk with one person about an ownership path and one about a placement path. Which details matter most for your life now?" },
};

// Module 3 facilitator blocks: a framing paragraph, one description per
// motivation driver, and the pathway orientation derivation.
export const MODULE_3_FACILITATOR = {
  framing: "Module 3 reports three motivation drivers and a derived pathway orientation. Read the drivers as what currently serves and energizes the learner, not as fixed traits, and never as a verdict on capacity.",
  self_direction: "How much the learner wants to build, own, and direct their own work. High suggests roles with autonomy and ownership, or growth toward running their own thing. Low is not lack of ambition; it suggests the learner thrives contributing within a structure someone else holds. Both legitimate.",
  stability_seeking: "How much the learner wants reliable footing. Read with the circumstance caution: high stability-seeking is often shaped by real material conditions, not temperament. A learner supporting family or carrying debt may have strong ownership drive and simply cannot afford risk. Never treat it as a ceiling on capacity or as permanent.",
  risk_comfort: "How much uncertainty the learner can sit with. The sustainability modifier. High self-direction with low risk comfort signals a learner who wants to build but will strain under sustained uncertainty; the response is scaffolding and a staged path, not redirection away from ownership. Watch the split between wanting the chance (RSK-02) and being able to sit with uncertainty (RSK-01, RSK-03, and reverse-scored RSK-04). Someone who wants the chance but cannot sit with the uncertainty is usually risk-constrained or risk-strained, not low in drive. Coaching angle: build the safety net into the plan.",
  pathway_orientation: "Derived from self-direction and stability-seeking as two independent axes. Ownership lean, placement lean, blended (high on both, the staged-path learner), still exploring (low on both, do not force a pathway). Use with Modules 1 and 2 for any placement recommendation, and confirm after a coaching conversation. Never use the orientation to gatekeep; it informs the shape of support, not eligibility.",
} as const;

// ─── Sustainability note (conditional: append when SDR high + RSK low) ───────

export const SUSTAINABILITY_NOTE =
  "Right now, your answers suggest that you want room to direct work and a steady sense of what comes next. This is a direction to explore, not a rule about how you have to proceed. You might build toward more ownership in stages, with support and stable steps along the way. Ask, “What support would make this next step workable?” Look for options that fit your resources and responsibilities right now.";

// ─── Module 2 universal framing ──────────────────────────────────────────────

export const MODULE_2_FRAMING =
  "Module 2 looked at how you tend to work in real situations. There are no better or worse answers here, just different ways of getting things done.";

// ─── Module 3 universal framing ──────────────────────────────────────────────

export const MODULE_3_FRAMING =
  "Module 3 looked at what tends to keep you going and what kind of path might fit you right now. This is about what serves you at this point in your life, not a fixed verdict about who you are or what you are capable of.";
