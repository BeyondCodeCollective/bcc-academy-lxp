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

// ─── Module 1: Archetype identity (v2 — 28 items, 7 archetypes × 4) ──────────
// Full rewrite, June 2026. Each archetype has 4 items in a fixed pattern:
// (1) everyday action, (2) group/work action, (3) line divider vs. nearest
// neighbor, (4) cost item — chosen despite a real tradeoff. Items display in
// randomized order. Do not reword M1-GRD-04 ("I may speak up" hedge is
// intentional).

export type M1Item = { id: string; text: string; archetype: ArchetypeKey };

export const MODULE_1_ITEMS: M1Item[] = [
  // Navigator — divider neighbor: Systems Thinker
  { id: "M1-NAV-01", text: "When a group starts working on something together, I'm usually the one who says what we're actually trying to get done before we split up the work.", archetype: "navigator" },
  { id: "M1-NAV-02", text: "When plans change, my first move is to get clear on the new goal before anyone decides what to do next.", archetype: "navigator" },
  { id: "M1-NAV-03", text: `When something a group is working on isn't coming out right, my first question is usually "is this even what we're supposed to be making?" rather than "which part went wrong?"`, archetype: "navigator" },
  { id: "M1-NAV-04", text: "When my friends are all hyped to do something but nobody's said what the plan actually is, I'll be the one to ask, even if it kills the vibe a little.", archetype: "navigator" },
  // Developer — divider neighbor: Systems Thinker
  { id: "M1-DEV-01", text: "At home or in my free time, I'm usually the one who builds things, sets things up, or makes something work the way I want it to.", archetype: "developer" },
  { id: "M1-DEV-02", text: "When a group has an idea, I'm usually the one who starts making a rough version so everyone has something real to look at.", archetype: "developer" },
  { id: "M1-DEV-03", text: "When something breaks, I care more about getting it working again than figuring out the full story of why it broke.", archetype: "developer" },
  { id: "M1-DEV-04", text: "When something I made doesn't work, I'll take it apart and redo it, even if it means starting over after hours of work.", archetype: "developer" },
  // Systems Thinker — divider neighbor: Developer
  { id: "M1-SYS-01", text: "When I take on something new, like a game, a job, or a skill, I start by figuring out how the pieces connect instead of jumping straight in.", archetype: "systems_thinker" },
  { id: "M1-SYS-02", text: "When my group is making a plan, I'm usually the one asking what happens to the other parts if we change this one.", archetype: "systems_thinker" },
  { id: "M1-SYS-03", text: "I'd rather understand exactly why something broke than just get it running again.", archetype: "systems_thinker" },
  { id: "M1-SYS-04", text: "When everyone wants the quick fix, I'm willing to slow the group down to find the real cause, even if people get impatient with me.", archetype: "systems_thinker" },
  // Designer/Creator — divider neighbor: Connector
  { id: "M1-DES-01", text: "When I care about something, I end up making something about it: a video, a playlist, a post, a drawing, or a story that shows people why it matters.", archetype: "designer" },
  { id: "M1-DES-02", text: "When a group has a complicated idea, I'm the one who turns it into something people can actually understand, like an example, a visual, or a story.", archetype: "designer" },
  { id: "M1-DES-03", text: "When something needs explaining, my instinct is to create the thing that explains it, not to find the right person to explain it.", archetype: "designer" },
  { id: "M1-DES-04", text: "I share things I make even when I'm nervous about how people will react.", archetype: "designer" },
  // Connector — divider neighbors: Support Specialist and Guardian
  { id: "M1-CON-01", text: "When a friend needs something, I usually know someone who can help, and I actually make the introduction.", archetype: "connector" },
  { id: "M1-CON-02", text: "When two people keep misunderstanding each other, I step in and put what each one means into words the other can hear.", archetype: "connector" },
  { id: "M1-CON-03", text: "When someone's stuck, my first move is to connect them with the person or resource that can help, rather than walk them through it myself.", archetype: "connector" },
  { id: "M1-CON-04", text: "At school, work, or in my community, I'll connect people from different groups even when it's awkward to be the one reaching across.", archetype: "connector" },
  // Support Specialist — divider neighbor: Guardian
  { id: "M1-SUP-01", text: "When someone in my family can't figure out something on their phone or computer, I sit with them and go through it step by step.", archetype: "support_specialist" },
  { id: "M1-SUP-02", text: "When a teammate is stuck, I break the problem into smaller steps so they can get moving again.", archetype: "support_specialist" },
  { id: "M1-SUP-03", text: "When things go wrong, I focus on the one person who's struggling more than on whether the whole group is holding together.", archetype: "support_specialist" },
  { id: "M1-SUP-04", text: "I'll stay with someone who's struggling until they get it, even when it would be faster to just do it for them.", archetype: "support_specialist" },
  // Guardian (formerly Culture Keeper) — divider neighbors: Support Specialist and Connector
  { id: "M1-GRD-01", text: "When someone new joins my class, team, or friend group, I'm one of the people who catches them up and pulls them into what's happening.", archetype: "guardian" },
  { id: "M1-GRD-02", text: "After a group argument or a rough moment, I'm usually the one who helps everyone reset so we can keep going.", archetype: "guardian" },
  { id: "M1-GRD-03", text: "I pay more attention to whether the whole group is still okay together than to any one person's progress.", archetype: "guardian" },
  // M1-GRD-04: preserved verbatim — the "I may speak up" hedge is intentional.
  { id: "M1-GRD-04", text: "In my family, when someone is being left out or talked over, I may speak up even if it feels uncomfortable.", archetype: "guardian" },
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
  /** Short tagline shown under the result header. */
  definition: string;
  /** "Your strengths" — the learner-facing strengths paragraph. */
  strengths: string;
  /** Career pathways by stage. Stages are NOT ages — a career changer can
      enter laterally. */
  pathways: { entry: string; mid: string; established: string };
  /** "Future thinking" — where the pattern is headed as AI reshapes work. */
  future: string;
  /** "The honest part" — no-overclaiming note in learner voice. */
  honest: string;
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
  guardian: {
    name: "Guardian",
    emoji: "🛡️",
    definition: "You protect the group's ability to participate, trust, and recover.",
    strengths: "You notice when someone is being left out, talked over, or pushed to the edges, and you are willing to do something about it even when it costs you comfort. You help groups recover after rough moments so the work and the relationships survive. This is not about being nice. It is about protecting the conditions that let everyone do their best work, and you do it when it is hardest: when speaking up has a price. Companies lose people, money, and trust when nobody does this work. You do it instinctively.",
    pathways: {
      entry: "Peer leader roles, HR coordinator, onboarding assistant, community programs assistant, people operations assistant.",
      mid: "Training and development specialist (a field the Bureau of Labor Statistics projects to keep growing), people operations specialist, employee experience roles, community health and outreach roles, learning program coordinator.",
      established: "HR manager, learning and development leadership, organizational development roles, head of people.",
    },
    future: "Workplaces are about to go through years of change as AI reshapes how teams work, and change is exactly when groups fracture. The people who keep teams intact through transitions, who manage adoption, onboarding, and trust, are doing work that gets more critical as everything else speeds up. Change and adoption support is a real, paid, growing role, and it is this pattern professionalized.",
    honest: "This strength is the most underestimated one in the room because it looks like personality instead of skill. It is a skill, it maps to real careers, and the cost you pay to use it, the discomfort of speaking up, is precisely what makes it valuable. Most people see what you see and stay silent.",
    facilitator: "Protects the group's ability to participate, trust, and recover (formerly Culture Keeper — the construct is participation protection and group recovery, NOT mood or niceness). Acts when someone is left out, talked over, or pushed out, and helps the group reset after rough moments. Strength: inclusion, group recovery, willingness to speak up at a personal cost. Growth edge: not carrying the group's repair work alone. Cross-module: distinguish Guardian (protecting the collective's ability to function) from Support Specialist (helping one struggling person) and Connector (linking people). Coaching angle: name it as a skill that maps to people-ops, training, and change/adoption roles; protect them from absorbing every conflict.",
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
