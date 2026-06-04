import type { ProgramConfig, IntakeQuestion, IntakeGate } from "./types";

// ─── Intake questions for single-event tracks ──────────────────────────────

const AUTOMATION_BOOTCAMP_INTAKE: IntakeQuestion[] = [
  {
    type: "radio",
    id: "gender",
    label: "What is your gender?",
    options: [
      "Man",
      "Woman",
      "Non-binary",
      "Genderqueer / Gender non-conforming",
      "Transgender",
      "Prefer not to say",
      "Other",
    ],
    required: true,
  },
  {
    type: "multi-select",
    id: "race_ethnicity",
    label: "What is your race and/or ethnicity? Select all that apply.",
    options: [
      "American Indian or Alaska Native",
      "Asian",
      "Black or African American",
      "Hispanic or Latino",
      "Middle Eastern or North African",
      "Native Hawaiian or Pacific Islander",
      "White",
      "Other",
    ],
    required: true,
  },
  {
    type: "multi-select",
    id: "employment_status",
    label: "What is your current employment status? Check all that apply.",
    options: [
      "Employed full-time",
      "Employed part-time",
      "Self-employed",
      "Unemployed — looking for work",
      "Unemployed — not looking for work",
      "Student",
      "Other",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "education_level",
    label: "What is your highest level of education?",
    options: [
      "Some high school",
      "High school diploma / GED",
      "Some college",
      "Associate degree",
      "Bachelor's degree",
      "Master's degree or higher",
      "Trade / vocational training",
      "Prefer not to say",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "how_heard",
    label: "How did you hear about this event?",
    options: [
      "Social media",
      "Friend or family",
      "Community organization",
      "Flyer or poster",
      "Email or newsletter",
      "School or employer",
      "Other",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "ai_experience",
    label: "How would you describe your experience with AI tools?",
    options: [
      "No experience — this is brand new to me",
      "Beginner — I've tried a tool once or twice",
      "Intermediate — I use AI tools occasionally",
      "Advanced — I use AI tools regularly",
    ],
    required: true,
  },
];

const AUTOMATION_BOOTCAMP_GATE: IntakeGate = {
  type: "intake",
  surveyKey: "automation-bootcamp",
  questions: AUTOMATION_BOOTCAMP_INTAKE,
};

export const forgeConfig: ProgramConfig = {
  slug: "forge",
  name: "Forge",
  tagline: "Where Innovation Meets Community",
  domain: "forge.bccacademy.io",
  logo: "/forge/logo.svg",
  colors: {
    primary: "#0047AB",
    primaryHover: "#003A8C",
    accent: "#2563EB",
    tagline: "#60A5FA",
  },
  defaultCohort: {
    name: "forge-cohort-1",
    displayName: "Beyond Code Centers — Cohort 1",
    startDate: "2026-04-17",
    totalWeeks: 8,
  },
  tracks: [
    {
      slug: "ai-fundamentals",
      name: "Basic AI Fundamentals",
      shortName: "AI Fundamentals",
      type: "weekly",
      totalWeeks: 4,
      sessionsPerWeek: 1,
      startDate: "2026-04-17",
      instructor: "Ashley Morgan",
      sessionTimes: ["Fridays · TBD"],
      lastSessionDayOffset: 6,
      defaultReflectionPrompts: [
        "What did you learn this week?",
        "What was challenging?",
        "How will you apply this going forward?",
      ],
      submissionsEnabled: true,
      reflectionsEnabled: true,
      weekSummaries: [
        { week: 1, topic: "Demystifying AI", icon: "💡" },
        { week: 2, topic: "AI Power User", icon: "⚡" },
        { week: 3, topic: "AI in Our Community", icon: "⚖️" },
        { week: 4, topic: "Wisdom Meets Innovation", icon: "🎨" },
      ],
      weeks: [
        {
          week: 1,
          title: "Demystifying AI",
          icon: "💡",
          subtitle: "Foundations & Mindset",
          description:
            "Build a plain-language understanding of what AI is, how it learns from data, and where it already shows up in your daily life. No prior tech background required — you belong in this conversation.",
          objectives: [
            "Define AI in your own words and explain how it learns from data",
            "Identify five or more AI tools you already use day to day",
            "Name Black women researchers shaping the field of AI ethics",
            "Articulate one concern about AI that matters for your community",
          ],
          sessions: [{ title: "Demystifying AI", time: "Friday · Time TBD" }],
        },
        {
          week: 2,
          title: "AI Power User",
          icon: "⚡",
          subtitle: "Hands-On Tool Use",
          description:
            "Get hands-on with ChatGPT and Claude to accomplish a real personal or professional task. Learn a simple prompting framework and understand what AI tools can — and can't — be trusted with.",
          objectives: [
            "Navigate ChatGPT and Claude with confidence",
            "Write stronger prompts using the ROLE + TASK + CONTEXT + FORMAT framework",
            "Recognize three types of AI hallucination and what to verify",
            "Identify information you should never share with an AI tool",
            "Complete at least one real task using an AI tool",
          ],
          sessions: [{ title: "AI Power User", time: "Friday · Time TBD" }],
        },
        {
          week: 3,
          title: "AI in Our Community",
          icon: "⚖️",
          subtitle: "Equity & Advocacy",
          description:
            "Examine how algorithmic bias shows up in hiring, criminal justice, and healthcare — and identify concrete advocacy actions to protect your community.",
          objectives: [
            "Define algorithmic bias and explain its three main causes",
            "Walk through real-world cases of AI bias in hiring, justice, and healthcare",
            "Explain the significance of Joy Buolamwini and Timnit Gebru's research",
            "Conduct a basic equity audit using four key questions",
            "Name one concrete advocacy action you can take",
          ],
          sessions: [{ title: "AI in Our Community", time: "Friday · Time TBD" }],
        },
        {
          week: 4,
          title: "Wisdom Meets Innovation",
          icon: "🎨",
          subtitle: "Building & Celebrating",
          description:
            "Experience vibe coding with Replit, pair across generations to design a solution rooted in lived community knowledge, and leave with a clear next step in your AI journey.",
          objectives: [
            "Define vibe coding and navigate the Replit interface",
            "Articulate your community knowledge as a product design asset",
            "Complete a two-sentence app pitch with an intergenerational partner",
            "Identify one concrete next step in your AI learning journey",
          ],
          sessions: [{ title: "Wisdom Meets Innovation", time: "Friday · Time TBD" }],
        },
      ],
    },
    {
      slug: "ai-digital-natives",
      name: "AI for Digital Natives",
      shortName: "AI Digital Natives",
      type: "weekly",
      totalWeeks: 8,
      sessionsPerWeek: 1,
      startDate: "2026-04-20",
      instructor: "Ashley Morgan",
      sessionTimes: ["Day & time TBD"],
      lastSessionDayOffset: 6,
      defaultReflectionPrompts: [
        "What did you learn this week?",
        "What was challenging?",
        "How will you apply this going forward?",
      ],
      submissionsEnabled: true,
      reflectionsEnabled: true,
      weekSummaries: [
        { week: 1, topic: "AI Landscape", icon: "🗺️" },
        { week: 2, topic: "Prompt Engineering", icon: "✍️" },
        { week: 3, topic: "AI for Content", icon: "🎨" },
        { week: 4, topic: "AI for Code", icon: "💻" },
        { week: 5, topic: "AI for Data", icon: "📊" },
        { week: 6, topic: "Building with AI APIs", icon: "🔌" },
        { week: 7, topic: "AI Ethics & Safety", icon: "🛡️" },
        { week: 8, topic: "Capstone Project", icon: "🎯" },
      ],
      weeks: [
        {
          week: 1,
          title: "The AI Landscape",
          icon: "🗺️",
          subtitle: "Understanding Today's AI Ecosystem",
          description: "Survey the current AI landscape — models, companies, tools, and where things are heading.",
          objectives: [
            "Map the major AI companies, models, and tools",
            "Understand the difference between open and closed AI models",
            "Explore trending AI applications and use cases",
            "Set up your AI toolkit for the course",
          ],
          sessions: [{ title: "The AI Landscape", time: "Day & time TBD" }],
        },
        {
          week: 2,
          title: "Prompt Engineering",
          icon: "✍️",
          subtitle: "Mastering AI Communication",
          description: "Learn advanced prompting techniques to get the most out of AI language models.",
          objectives: [
            "Master zero-shot, few-shot, and chain-of-thought prompting",
            "Learn system prompts and persona-based interactions",
            "Practice structured output generation (JSON, tables, code)",
            "Build a personal prompt library",
          ],
          sessions: [{ title: "Prompt Engineering", time: "Day & time TBD" }],
        },
        {
          week: 3,
          title: "AI for Content Creation",
          icon: "🎨",
          subtitle: "Creative AI Tools",
          description: "Use AI to create text, images, audio, and video content.",
          objectives: [
            "Generate and edit images with AI tools",
            "Create written content with AI assistance",
            "Explore AI audio and video generation",
            "Understand copyright and attribution with AI-generated content",
          ],
          sessions: [{ title: "AI for Content Creation", time: "Day & time TBD" }],
        },
        {
          week: 4,
          title: "AI for Code",
          icon: "💻",
          subtitle: "Programming with AI Assistance",
          description: "Learn to use AI as a coding partner — from generating code to debugging and learning new languages.",
          objectives: [
            "Use AI coding assistants (Copilot, Claude, Cursor)",
            "Generate, debug, and refactor code with AI",
            "Build a simple project with AI pair programming",
            "Understand the limits of AI-generated code",
          ],
          sessions: [{ title: "AI for Code", time: "Day & time TBD" }],
        },
        {
          week: 5,
          title: "AI for Data",
          icon: "📊",
          subtitle: "Data Analysis with AI",
          description: "Use AI to analyze data, generate insights, and create visualizations.",
          objectives: [
            "Upload and analyze datasets with AI tools",
            "Generate charts and visualizations from data",
            "Extract insights and summaries from complex data",
            "Understand data privacy when using AI tools",
          ],
          sessions: [{ title: "AI for Data", time: "Day & time TBD" }],
        },
        {
          week: 6,
          title: "Building with AI APIs",
          icon: "🔌",
          subtitle: "Integrating AI into Applications",
          description: "Connect AI models to your own applications using APIs.",
          objectives: [
            "Understand what an API is and how AI APIs work",
            "Make API calls to AI models (OpenAI, Anthropic)",
            "Build a simple AI-powered app or chatbot",
            "Manage API keys, costs, and rate limits",
          ],
          sessions: [{ title: "Building with AI APIs", time: "Day & time TBD" }],
        },
        {
          week: 7,
          title: "AI Ethics & Safety",
          icon: "🛡️",
          subtitle: "Responsible AI Use",
          description: "Explore the ethical dimensions of AI — bias, safety, regulation, and responsible development.",
          objectives: [
            "Identify bias in AI systems and how to mitigate it",
            "Understand AI safety and alignment challenges",
            "Discuss regulation and governance of AI",
            "Develop a personal framework for responsible AI use",
          ],
          sessions: [{ title: "AI Ethics & Safety", time: "Day & time TBD" }],
        },
        {
          week: 8,
          title: "Capstone Project",
          icon: "🎯",
          subtitle: "Show What You've Built",
          description: "Present a project that demonstrates your AI skills — from concept to execution.",
          objectives: [
            "Design and build an AI-powered project",
            "Present your project to the cohort",
            "Give and receive constructive feedback",
            "Plan your continued AI learning journey",
          ],
          sessions: [{ title: "Capstone Presentations", time: "Day & time TBD" }],
        },
      ],
    },
    {
      slug: "ai-automation-bootcamp",
      name: "AI Automation Bootcamp",
      shortName: "AI Automation",
      type: "single-event",
      totalWeeks: 1,
      sessionsPerWeek: 1,
      startDate: "2026-04-24",
      instructor: "Ashley Morgan",
      sessionTimes: ["Friday April 24 · 2 hours"],
      lastSessionDayOffset: 0,
      submissionsEnabled: false,
      reflectionsEnabled: false,
      gates: [AUTOMATION_BOOTCAMP_GATE],
      weekSummaries: [
        { week: 1, topic: "AI Automation", icon: "⚡" },
      ],
      weeks: [
        {
          week: 1,
          title: "AI Automation Bootcamp",
          icon: "⚡",
          subtitle: "Automate Your Workflow with AI",
          description:
            "A hands-on 2-hour intensive on using AI to automate repetitive tasks — from no-code tools to AI-powered workflows.",
          objectives: [
            "Identify tasks in your workflow that AI can automate",
            "Use no-code AI automation tools (Zapier AI, Make, etc.)",
            "Build an automated workflow from scratch",
            "Understand when automation helps vs. when it hurts",
          ],
          sessions: [{ title: "AI Automation Bootcamp", time: "Friday · 2-hour session" }],
        },
      ],
    },
  ],
  tutorConfig: {
    enabled: false,
    systemPrompt: `You are the AI Tutor for "Beyond Code Centers", a program by Beyond Code Collective that teaches AI skills to the next generation of digital creators and professionals.

You are helping students learn AI fundamentals, tools, and applications. The program includes:
- Basic AI Fundamentals (4 weeks): Demystifying AI, AI Power User, AI in Our Community, Wisdom Meets Innovation
- AI for Digital Natives (8 weeks): AI landscape, prompt engineering, AI for content/code/data, APIs, ethics
- AI Automation Bootcamp: Hands-on workflow automation with AI

Guidelines:
- Be encouraging and meet students where they are — some are beginners, some are more advanced.
- Use clear, modern language. These are digital natives who learn by doing.
- Provide hands-on examples and exercises when possible.
- When answering questions, give practical, actionable answers with examples.
- Encourage experimentation and creative use of AI tools.
- Keep responses focused — 2-3 short paragraphs max unless they ask for more detail.`,
  },
  surveys: [
    {
      id: "pre-survey-spring-2026",
      title: "Pre-Survey",
      description: "Help us understand your background and experience so we can better support you.",
      required: true,
    },
    {
      id: "post-survey-spring-2026",
      title: "Post-Survey",
      description:
        "You made it — share how the program landed and where you're headed next. Takes about 5 minutes.",
      required: false,
    },
  ],
  resourcesEnabled: false,
  requireInviteLink: true,
  coppa: { required: false },
  seo: {
    title: "Beyond Code Centers — Where Innovation Meets Community",
    description:
      "Beyond Code Centers by Beyond Code Collective — where innovation meets community. AI fundamentals, prompt engineering, and automation skills training.",
    ogTitle: "Beyond Code Centers — Where Innovation Meets Community",
    ogDescription:
      "Beyond Code Centers by Beyond Code Collective — where innovation meets community.",
  },
  organization: "Beyond Code Collective",
};
