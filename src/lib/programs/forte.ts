import type { ProgramConfig } from "./types";

// Upskill Bahamas — a beginner-friendly AI literacy program for the Bahamian
// market, served from forte.bccacademy.io. Curriculum is the 10-session
// "AI Literacy" track below (see .context/attachments/ForteBahamas syllabus).
//
// NOTE: "forte" is a separate program from "forge" (Beyond Code Centers) — similar
// names, unrelated programs.
//
// Forte runs fully self-paced — every session is a pre-recorded video, no live
// meetings. The `selfPaced: true` flag on the track unlocks per-week recordings
// and submissions independently of `startDate`, so this date is only the
// marketing "Starts" label on the overview page (and not a real gate on
// content). Pre-launch we keep it in the future so the overview reads "Not
// Launched" while still letting testers and early students use the content.
const FORTE_START_DATE = "2026-06-01";

export const forteConfig: ProgramConfig = {
  slug: "forte",
  name: "Upskill Bahamas",
  tagline: "AI literacy for the modern Bahamas",
  domain: "forte.bccacademy.io",
  // IT hasn't cut DNS over yet — until then, the program switcher uses the
  // cookie-based override so super-admins can still preview Forte content
  // from bccacademy.io. Remove this line once forte.bccacademy.io resolves.
  dnsReady: false,
  // TODO(branding): placeholder wordmark — swap in real Forte branding.
  logo: "/forte/logo.svg",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#E54D2E",
    tagline: "#E54D2E",
  },
  defaultCohort: {
    name: "forte-cohort-1",
    displayName: "Upskill Bahamas — Cohort 1",
    startDate: FORTE_START_DATE,
    totalWeeks: 10,
  },
  tracks: [
    {
      slug: "ai-literacy",
      name: "AI Literacy",
      shortName: "AI Literacy",
      description:
        "Ten self-paced sessions to build real, practical AI and digital skills you can use right away — at work, in school, or on your own projects. Each week comes with guided activities and a short written deliverable.\n\nUse whatever AI tool you like — ChatGPT, Gemini, Claude. Free versions cover everything. Keep your notes wherever works for you.",
      officeHours: [
        {
          date: "2026-06-08",
          time: "1pm EST",
          title: "Office Hours",
          description:
            "Drop in with your questions, experiments, and half-baked ideas — this is open space to explore how AI tools can support your work, your learning, and your next move.",
        },
        {
          date: "2026-06-23",
          time: "4pm EST",
          title: "Building an App Using Replit",
          description:
            "A hands-on intro to building and running code in the browser to develop your own app — no setup required, just curiosity and a willingness to try something new. Join using any device but note that a computer is best suited for this activity.",
        },
        {
          date: "2026-07-09",
          time: "9am EST",
          title: "Office Hours",
          description:
            "Drop in with your questions, experiments, and half-baked ideas — this is open space to explore how AI tools can support your work, your learning, and your next move.",
        },
      ],
      type: "weekly",
      totalWeeks: 10,
      sessionsPerWeek: 1,
      startDate: FORTE_START_DATE,
      instructor: "Ashley Morgan",
      sessionTimes: ["Self-paced"],
      lastSessionDayOffset: 6,
      selfPaced: true,
      submissionsEnabled: true,
      // Forte's "Written Artifact" is modeled as the project submission
      // (structured prompts on the SubmissionForm), not as a separate
      // reflection. Keep reflections off so the student sees one submission
      // block per week, not two.
      reflectionsEnabled: false,
      weekSummaries: [
        { week: 1, topic: "What AI Is", icon: "🤖" },
        { week: 2, topic: "AI & Bias", icon: "⚖️" },
        { week: 3, topic: "Prompt Design", icon: "✍️" },
        { week: 4, topic: "Digital Identity", icon: "🪪" },
        { week: 5, topic: "Communication", icon: "💬" },
        { week: 6, topic: "Productivity", icon: "⚡" },
        { week: 7, topic: "Learning", icon: "📚" },
        { week: 8, topic: "Innovation", icon: "💡" },
        { week: 9, topic: "Research", icon: "🔍" },
        { week: 10, topic: "Entrepreneurship", icon: "🚀" },
      ],
      weeks: [
        {
          week: 1,
          title: "Will We Ever Achieve AGI?",
          icon: "🤖",
          subtitle: "What AI Is — and Who Defines It",
          description:
            "What AI actually is, what it isn't, and who gets to define it. This opening session grounds the program in a clear, plain-language understanding of artificial intelligence before any tool use begins. A conceptual video session — no submission.",
          objectives: [
            "Define what artificial intelligence is — and what it is not",
            "Understand the debate around artificial general intelligence (AGI)",
            "Recognize who shapes how AI is defined and built",
          ],
          sessions: [{ title: "Will We Ever Achieve AGI?", time: "Self-paced" }],
          submissionsEnabled: false,
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-1/upskill-bahamas-1.mp4",
        },
        {
          week: 2,
          title: "Is AI Objective?",
          icon: "⚖️",
          subtitle: "Bias, Equity, and AI Systems",
          description:
            "How bias enters AI systems, what it looks like in everyday life, and what we can do about it. This session sets an equity lens before any hands-on work begins. A conceptual video session — no submission.",
          objectives: [
            "Explain how bias enters AI systems",
            "Identify examples of AI bias in everyday life",
            "Describe practical responses to biased AI output",
          ],
          sessions: [{ title: "Is AI Objective?", time: "Self-paced" }],
          submissionsEnabled: false,
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-2/upskill-bahamas-2.mp4",
        },
        {
          week: 3,
          title: "Prompt Design & AI Communication",
          icon: "✍️",
          subtitle: "The ROLE + TASK + CONTEXT + FORMAT Framework",
          description:
            "Every strong prompt has four elements — ROLE (\"you are a [type of expert]\"), TASK (the specific action you want), CONTEXT (the background the AI needs to be useful), and FORMAT (length, tone, audience, structure). This session builds the foundational skill that makes every session after it work better. Deliverable: a Personal Prompt Toolkit.",
          objectives: [
            "Activity 1 — Build a structured prompt using all four elements, then compare it to a simple version of the same request",
            "Activity 2 — Add one more constraint (a tone, an audience, or a word limit) and find the point of diminishing returns",
            "Activity 3 — Write three reusable prompt templates for recurring tasks, each using the full ROLE + TASK + CONTEXT + FORMAT structure",
          ],
          sessions: [
            { title: "Prompt Design & AI Communication", time: "Self-paced" },
          ],
          submissionPrompts: [
            "Your three prompt templates, with a note on when and why to use each.",
            "The best prompt you wrote today — and what specifically made it work. Name the elements.",
            "One thing you now understand about how AI responds to input that you didn't understand before today.",
            "What's the next prompt template you'd add to this toolkit? What recurring task does it serve?",
          ],
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-3/upskill-bahamas-3.mp4",
        },
        {
          week: 4,
          title: "Building Your Professional Digital Identity",
          icon: "🪪",
          subtitle: "Professional Bio + Identity Statement",
          description:
            "What \"professional\" actually means, how AI defaults to the wrong definition, and how to push past it. You'll draft and refine a bio and identity statement that sounds like you. Deliverable: Professional Bio + Identity Statement.",
          objectives: [
            "Activity 1 — Draft a first-pass professional bio with AI and judge whether it sounds like a specific person",
            "Activity 2 — Add real details (an achievement, real context, a value of your own) and compare the revised bio side by side",
            "Activity 3 — Write a one-sentence identity statement that couldn't describe anyone else",
          ],
          sessions: [
            {
              title: "Building Your Professional Digital Identity",
              time: "Self-paced",
            },
          ],
          submissionPrompts: [
            "Your revised professional bio — minimum 3 sentences, specific to you. Include your real role, real context, and something that distinguishes you from a generic description.",
            "One sentence, your own words: who you are professionally and what you bring. Specific enough that it couldn't describe anyone else.",
            "What did the AI get right? What did you have to correct, add, or rewrite entirely? Be specific about what the gap was.",
            "What one thing about your professional story are you most confident about? What do you want people to know?",
          ],
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-4/upskill-bahamas-4.mp4",
        },
        {
          week: 5,
          title: "Say It Better: Communication Toolkit",
          icon: "💬",
          subtitle: "Tone, Messaging, and Emotional Intelligence in Writing",
          description:
            "Tone-shifting, professional messaging, and emotional intelligence in writing. You'll produce three audience versions of one message. Deliverable: Communication Toolkit.",
          objectives: [
            "Activity 1 — Draft a real message and ask AI to revise it for a specific context (more formal, more collaborative, or more direct)",
            "Activity 2 — Adjust one specific element only — just the opening, just the ask, or just the closing — and notice the effect on the whole tone",
            "Activity 3 — Write three versions of one message for three audiences: a supervisor, a peer, and a client or community member",
          ],
          sessions: [
            { title: "Say It Better: Communication Toolkit", time: "Self-paced" },
          ],
          submissionPrompts: [
            "Your three-audience message set — all three versions included, with a one-sentence note on what changed for each audience.",
            "The most important edit you made to AI's output. What did you change and why?",
            "One principle about professional tone that you'll carry with you. Put it in your own words.",
            "What's one situation coming up where you'll use what you practiced today?",
          ],
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-5/upskill-bahamas-5.mp4",
        },
        {
          week: 6,
          title: "AI-Powered Productivity",
          icon: "⚡",
          subtitle: "Task Breakdown, Time Blocking, and Workflow",
          description:
            "Task breakdown, time blocking, and workflow summaries. You'll build a real plan for the week ahead. Deliverable: Weekly Productivity Plan.",
          objectives: [
            "Activity 1 — Ask AI to break a real to-do item into smaller tasks, then judge whether it reflects how the work actually happens",
            "Activity 2 — Add your real constraints (time available, order, dependencies) and see how the plan changes",
            "Activity 3 — Build a Weekly Productivity Plan for next week and edit it to reflect reality",
          ],
          sessions: [{ title: "AI-Powered Productivity", time: "Self-paced" }],
          submissionPrompts: [
            "Your completed Weekly Productivity Plan for next week.",
            "What did AI miss or get wrong about your actual workload? What did you have to add or correct?",
            "One task you've been avoiding that this process helped you break down into something manageable.",
            "How will you use AI for planning going forward? Be specific about when and how.",
          ],
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-6/upskill-bahamas-6.mp4",
        },
        {
          week: 7,
          title: "AI as a Learning Tool",
          icon: "📚",
          subtitle: "Simplification, Roadmaps, and Better Questions",
          description:
            "Simplification, learning roadmaps, and asking better questions. You'll build a structured path for a topic you actually want to understand. Deliverable: 7-Day Learning Plan.",
          objectives: [
            "Activity 1 — Ask AI to explain a topic you want to understand, then test whether you can explain it back in your own words",
            "Activity 2 — Ask AI to re-explain what confused you with a different example, then ask what to learn first",
            "Activity 3 — Build a 7-day learning plan and edit it for your schedule, learning style, and actual goal",
          ],
          sessions: [{ title: "AI as a Learning Tool", time: "Self-paced" }],
          submissionPrompts: [
            "Your 7-Day Learning Plan — edited and specific to your actual situation, not just what AI produced.",
            "What was the most useful question you asked today? Why did it work?",
            "One thing you now understand about your topic that you didn't understand before starting.",
            "What's the most important thing to learn next, and how will you do it?",
          ],
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-7/upskill-bahamas-7.mp4",
        },
        {
          week: 8,
          title: "AI for Creative Thinking & Innovation",
          icon: "💡",
          subtitle: "Brainstorming, Ideation, and Stress-Testing",
          description:
            "Brainstorming, ideation, and overcoming creative blocks. You'll develop and pressure-test one real idea. Deliverable: Innovation Proposal.",
          objectives: [
            "Activity 1 — Define a problem or opportunity and ask AI for ideas without filtering",
            "Activity 2 — Develop your strongest idea, then ask AI to argue against it and decide which objections are real",
            "Activity 3 — Draft the opening of your Innovation Proposal — the idea, the problem it solves, the community it serves, and why it's worth trying",
          ],
          sessions: [
            { title: "AI for Creative Thinking & Innovation", time: "Self-paced" },
          ],
          submissionPrompts: [
            "Your idea — 1 paragraph: what it is, what problem it solves, who it serves.",
            "The strongest objection to your idea — and how you'd respond to it.",
            "What did AI suggest that you rejected? Why wasn't it the right fit?",
            "If you were actually going to pursue this, what's the first concrete step you'd take?",
          ],
          videoUrl: "https://rgveukvuifuwtfkrbdty.supabase.co/storage/v1/object/public/session-files/forte/ai-literacy/week-8/upskill-bahamas-8.mp4",
        },
        {
          week: 9,
          title: "AI for Research, Analysis & Reporting",
          icon: "🔍",
          subtitle: "Summarization, Fact-Checking, and Report Structure",
          description:
            "Summarization, fact-checking, and report structure. Verify every claim and own the output. Never paste documents containing personal information, health records, or confidential organizational materials into an AI tool. Deliverable: Research Mini-Report.",
          objectives: [
            "Activity 1 — Ask AI for a summary of a topic, then fact-check three specific claims against credible sources",
            "Activity 2 — Organize your verified claims into a report structure: context, findings, implications",
            "Activity 3 — Write a 3–4 paragraph Research Mini-Report with at least two verified, cited sources",
          ],
          sessions: [
            { title: "AI for Research, Analysis & Reporting", time: "Self-paced" },
          ],
          submissionPrompts: [
            "Your completed Research Mini-Report — 3–4 paragraphs, structured, with verified claims and cited sources.",
            "What did you have to fact-check? What did you find when you looked it up?",
            "What did AI get wrong or fabricate? How did you catch it? What would have happened if you hadn't?",
            "One thing you learned about this topic that you didn't know before.",
          ],
          comingSoonUntil: "2026-06-01",
        },
        {
          week: 10,
          title: "AI for Entrepreneurship",
          icon: "🚀",
          subtitle: "Opportunity, Branding, and Workflow Design",
          description:
            "Opportunity identification, branding, and workflow design. You'll leave with two real artifacts grounded in the Bahamian economic context. Deliverable: Local Opportunity Brief + Brand Starter.",
          objectives: [
            "Activity 1 — Write a one-paragraph opportunity summary with AI, then draft a brand name and tagline",
            "Activity 2 — Build a simple 5-step workflow from first idea to first real action, adjusted for your actual resources and context",
            "Activity 3 — Draft the opening of your Local Opportunity Brief: the gap you see, the community you'd serve, and one concrete next step",
          ],
          sessions: [{ title: "AI for Entrepreneurship", time: "Self-paced" }],
          submissionPrompts: [
            "Local Opportunity Brief — 3–4 paragraphs: the gap, the audience, your proposed response, one next step.",
            "Brand Starter — name, tagline, and one-sentence positioning statement.",
            "What's the one skill from this entire program you'll use most in building this?",
            "What's the first thing you're going to do with what you've built here?",
          ],
          comingSoonUntil: "2026-06-01",
        },
      ],
    },
  ],
  requireInviteLink: true,
  coppa: { required: false },
  seo: {
    title: "Upskill Bahamas — AI Literacy Program by Beyond Code Collective",
    description:
      "Upskill Bahamas builds confidence with the essential AI and digital skills needed to thrive in a modern, tech-enabled world. A beginner-friendly AI literacy program by Beyond Code Collective.",
    ogTitle: "Upskill Bahamas — AI Literacy Program",
    ogDescription:
      "Beginner-friendly AI literacy training — prompt design, digital identity, productivity, research, and entrepreneurship. By Beyond Code Collective.",
  },
  organization: "Beyond Code Collective",
};
