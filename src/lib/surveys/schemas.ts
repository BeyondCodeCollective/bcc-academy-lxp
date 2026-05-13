import type { SurveyQuestion } from "@/components/survey-fields";

// Flat question schemas per survey id, used by the admin Survey Insights
// dashboard to introspect what kind of aggregation/visualization to render
// for each response field. The live survey wizards
// (`src/components/survey-wizard.tsx` and the `public-*-survey.tsx` files)
// remain the source of truth for what users see — these schemas mirror what
// they collect so the dashboard can read response JSON keyed by question id.
//
// If a wizard's questions change, mirror the change here. Drift only affects
// the dashboard's labels and chart structure; live data collection is
// unaffected.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

// Workshop names that go in the Workshop Name dropdown on the bcc-workshop
// survey. Update this list when the team launches new workshops — keeping
// the dropdown closed prevents typo'd workshop labels in the data.
export const WORKSHOP_NAMES = [
  "Code with Culture x BCC",
  "Subsume x BCC",
  "Lunch & Learn | Career Shifting + Mental Health",
  "Home for the Summers",
  "Replit Bootcamp for Wisdom Circle Leaders",
  "Welcome to the Lab | Intro to High Schoolers in Tech",
  "BIT x BCC",
  "Subsume x BCC | Afrofuturism Storytelling",
  "Your Idea Your App | AI Building w/ Replit for Teens",
  "Design Thinking for Educators",
  "Beat, Brand & Beyond",
  "Headshots + Happy Hour Networking Session",
  "Designing Your World | For High Schoolers",
  "Breakfast AI Chat | Educators + Parents",
  "BIT x BCC Cybersecurity",
  "Game On",
  "Canva 101 for Wisdom Circle Leaders",
];

export const WORKSHOP_LOCATIONS = ["NYC", "ATL", "Virtual"];

const SHARED_DEMOGRAPHICS: SurveyQuestion[] = [
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
      "Prefer not to say",
      "Other",
    ],
    required: true,
  },
  {
    type: "multi-select",
    id: "languages",
    label: "What languages do you speak at home? Select all that apply.",
    options: ["English", "Spanish", "Prefer not to say", "Other"],
    required: true,
  },
  {
    type: "radio",
    id: "first_gen_college",
    label:
      "If you started college today, would you be the first in your immediate family to attend or complete college?",
    options: ["Yes", "No", "Not applicable", "Prefer not to say"],
    required: true,
  },
  {
    type: "multi-select",
    id: "employment_status",
    label: "What is your current employment status? Select all that apply.",
    options: [
      "Employed full-time",
      "Employed part-time",
      "Unemployed",
      "Looking for work",
      "Not currently looking for work",
      "Student",
      "Prefer not to say",
      "Other",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "household_income",
    label: "What best describes your household income range?",
    options: [
      "Under $20,000",
      "$20,000 – $39,999",
      "$40,000 – $59,999",
      "$60,000 – $79,999",
      "$80,000 or more",
      "Prefer not to say",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "disability",
    label: "Do you identify as a person with a disability?",
    options: ["Yes", "No", "Prefer not to say"],
    required: true,
  },
  {
    type: "radio",
    id: "education_level",
    label: "What is the highest level of education you have completed?",
    options: [
      "Some high school (no diploma)",
      "High school diploma or GED",
      "Some college (no degree)",
      "Associate degree",
      "Bachelor's degree",
      "Graduate or professional degree",
      "Prefer not to say",
    ],
    required: true,
  },
];

// ─── bcc-learner-intake ──────────────────────────────────────────────────────
const BCC_LEARNER_INTAKE: SurveyQuestion[] = [
  ...SHARED_DEMOGRAPHICS,
];

// Question ids collected by `bcc-learner-intake`. Other surveys (e.g. the
// Forge pre-survey) embed the same demographic block under the same ids,
// so the auth callback can recognize a public submission as having covered
// the intake and skip re-asking. Keep this list in sync with
// SHARED_DEMOGRAPHICS above.
export const BCC_INTAKE_QUESTION_IDS = [
  "gender",
  "race_ethnicity",
  "languages",
  "first_gen_college",
  "employment_status",
  "household_income",
  "disability",
  "education_level",
] as const;

// ─── bcc-workshop (public) ───────────────────────────────────────────────────
const BCC_WORKSHOP: SurveyQuestion[] = [
  {
    type: "radio",
    id: "workshop_name",
    label: "Workshop name",
    options: WORKSHOP_NAMES,
    required: true,
  },
  {
    type: "radio",
    id: "workshop_location",
    label: "Workshop location",
    options: WORKSHOP_LOCATIONS,
    required: true,
  },
  {
    type: "likert",
    id: "learning_outcomes",
    label: "Rate yourself on the following",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Not at all", high: "5 — Very much" },
    statements: [
      "I understand the main ideas from today.",
      "I feel ready to use what I learned.",
      "Learning about this topic will help me grow personally and professionally.",
    ],
    required: true,
  },
  {
    type: "text",
    id: "best_part",
    label: "What was the best part of today's workshop?",
    required: true,
  },
  {
    type: "text",
    id: "still_unsure",
    label: "Is there anything from today that you're still not sure about?",
    required: false,
  },
  {
    type: "likert",
    id: "workshop_rating",
    label: "How would you rate today's workshop overall?",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Not useful", high: "5 — Very useful" },
    statements: ["Overall workshop rating"],
    required: true,
  },
  {
    type: "text",
    id: "plan_to_do",
    label: "What is one thing you plan to do because of this workshop?",
    required: true,
  },
  {
    type: "multi-select",
    id: "want_next",
    label: "What would you want to learn or do next with Beyond Code Collective?",
    options: [
      "Another workshop on a related topic",
      "A longer multi-week program",
      "1:1 coaching",
      "Help connecting to others learning the same thing",
      "Just stay in touch about future opportunities",
      "Not sure yet — keep me posted",
      "Other",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "recommend_bcc",
    label: "How likely are you to recommend Beyond Code Collective?",
    scale: LIKERT_1_5,
    scaleAnchors: {
      low: "1 — Not likely at all",
      high: "5 — I'd definitely recommend it",
    },
    statements: ["Likelihood to recommend"],
    required: true,
  },
  {
    type: "text",
    id: "anything_else",
    label: "Anything else you want to share?",
    required: false,
  },
];

// ─── network-plus-post (Catalyst end-of-cohort, public version) ──────────────
const NETWORK_PLUS_POST: SurveyQuestion[] = [
  {
    type: "radio",
    id: "contact_follow_up",
    label: "Is it okay if BCC contacts you in the next 1–2 years to see how you're doing?",
    options: [
      "Yes, you can contact me",
      "No, please don't contact me for follow-up",
    ],
    required: false,
  },
  ...SHARED_DEMOGRAPHICS,
  {
    type: "radio",
    id: "how_heard",
    label: "How did you hear about this program?",
    options: [
      "Friend, family member, or colleague",
      "Social media",
      "Employer or workforce program",
      "School, teacher, or counselor",
      "Email or newsletter",
      "Online search",
      "Other",
    ],
    required: true,
  },
  {
    type: "text",
    id: "why_enroll",
    label: "What drove you to enroll in this program?",
    required: true,
  },
  {
    type: "likert",
    id: "confidence_before",
    label: "Confidence BEFORE the program",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Not at all confident", high: "5 — Very confident" },
    statements: [
      "I understand core networking concepts (IP addresses, subnets, protocols).",
      "I can explain how networks work to someone who isn't technical.",
      "I feel confident troubleshooting a basic networking problem.",
      "I see myself succeeding in a tech career.",
      "I belong in this industry.",
      "I know how to keep learning new tech skills on my own.",
      "I can talk about my technical skills in a job interview.",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "confidence_now",
    label: "Confidence RIGHT NOW",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Not at all confident", high: "5 — Very confident" },
    statements: [
      "I understand core networking concepts (IP addresses, subnets, protocols).",
      "I can explain how networks work to someone who isn't technical.",
      "I feel confident troubleshooting a basic networking problem.",
      "I see myself succeeding in a tech career.",
      "I belong in this industry.",
      "I know how to keep learning new tech skills on my own.",
      "I can talk about my technical skills in a job interview.",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "experience_agreement",
    label: "Your experience in this program",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly disagree", high: "5 — Strongly agree" },
    statements: [
      "The pace of the program worked for my schedule and learning style.",
      "I felt supported by the instructors and program team.",
      "The material felt relevant to real-world work.",
      "I felt a sense of belonging in this cohort.",
      "The Tech+ content gave me a strong foundation for Network+.",
    ],
    required: true,
  },
  {
    type: "text",
    id: "most_valuable",
    label: "What was the most valuable part of this program for you?",
    required: true,
  },
  {
    type: "text",
    id: "most_challenging",
    label: "What was the most challenging part — or what could have been better?",
    required: true,
  },
  {
    type: "multi-select",
    id: "next_step_support",
    label: "What would help you most as a next step?",
    options: [
      "Job placement help / employer connections",
      "Resume and interview prep",
      "Continued mentorship or coaching",
      "Continued learning (e.g., Security+, Cloud, etc.)",
      "Networking events or community connections",
      "Help with exam prep",
      "Financial support information",
      "Other",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "securityplus_interest",
    label: "How interested are you in continuing to CompTIA Security+ next?",
    options: [
      "Very interested — count me in",
      "Somewhat interested — I'd want to know more first",
      "Undecided — depends on timing",
      "Probably not right now",
      "Not interested",
    ],
    required: true,
  },
  {
    type: "multi-select",
    id: "securityplus_factors",
    label: "If we offered Security+, what would matter most to you?",
    options: [
      "Schedule flexibility",
      "Same instructors / same cohort feel",
      "Clear path to a job after",
      "Scholarship or financial support",
      "Time gap between Network+ and Security+",
    ],
    required: false,
  },
  {
    type: "likert",
    id: "recommend_bcc",
    label: "How likely are you to recommend Beyond Code Collective?",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Not at all likely", high: "5 — Extremely likely" },
    statements: ["Likelihood to recommend"],
    required: true,
  },
  {
    type: "text",
    id: "thirty_day_change",
    label:
      "In the past 30 days, what's one specific thing you did differently because of this program?",
    required: true,
  },
  {
    type: "text",
    id: "anything_else",
    label: "Anything else you'd like us to know?",
    required: false,
  },
];

// ─── pre-survey-spring-2026 (Forge auth pre-survey) ──────────────────────────
const PRE_SURVEY_SPRING_2026: SurveyQuestion[] = [
  ...SHARED_DEMOGRAPHICS,
  {
    type: "multi-select",
    id: "device_access",
    label: "What devices do you have regular access to right now?",
    options: [
      "Smartphone (iPhone, Android, etc.)",
      "Laptop",
      "Desktop computer",
      "Tablet",
      "I don't have regular access to any of these",
    ],
    required: true,
  },
  {
    type: "text",
    id: "computer_access",
    label:
      "Where do you usually go when you need to use a computer or get online?",
    required: true,
  },
  {
    type: "likert",
    id: "digital_experience",
    label: "Digital Experience",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
    statements: [
      "I feel comfortable using a computer or tablet on my own.",
      "I feel comfortable using technology.",
      "I know how to search for information online and check if it's reliable.",
      "I feel confident sending a professional email.",
      "I understand how to stay safe online (passwords, scams, privacy).",
      "I can use tools like Google Docs, Sheets, or MS Word for school or work.",
      "I feel like technology is something I can learn and control.",
      "I could use technology to help me reach a goal (job, school, or creative).",
      "I'm excited to use new technologies.",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "ai_experience",
    label: "AI Tools",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
    statements: [
      "I'm familiar with everyday AI tools (e.g. ChatGPT, Google Gemini, Snapchat AI).",
      "I'm familiar with coding AI tools (e.g. Codex, Replit, Loveable).",
      "I know what AI tools are and have a basic idea of how they work.",
      "I see learning AI tools as a skill worth developing seriously.",
      "I feel confident I could learn to use AI tools well.",
      "AI feels relevant to my future goals.",
    ],
    required: true,
  },
  {
    type: "text",
    id: "ai_perspective",
    label: "What is your perspective and experience with AI?",
    required: true,
  },
  {
    type: "text",
    id: "anything_else",
    label: "Is there anything else important for us to know?",
    required: false,
  },
];

// ─── post-survey-spring-2026 (Forge AI Fundamentals end-of-program) ─────────
//
// Reuses the exact `digital_experience` and `ai_experience` Likert ids and
// statements from `pre-survey-spring-2026` so the dashboard can pair pre→post
// per student to compute true confidence deltas.
const POST_SURVEY_SPRING_2026: SurveyQuestion[] = [
  {
    type: "radio",
    id: "program_variant",
    label: "Which version of the program did you take?",
    options: [
      "AI Fundamentals",
      "AI Fundamentals for Digital Natives",
      "AI Fundamentals for Wisdom Circle Leaders",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "digital_experience",
    label: "Digital Experience",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
    statements: [
      "I feel comfortable using a computer or tablet on my own.",
      "I feel comfortable using technology.",
      "I know how to search for information online and check if it's reliable.",
      "I feel confident sending a professional email.",
      "I understand how to stay safe online (passwords, scams, privacy).",
      "I can use tools like Google Docs, Sheets, or MS Word for school or work.",
      "I feel like technology is something I can learn and control.",
      "I could use technology to help me reach a goal (job, school, or creative).",
      "I'm excited to use new technologies.",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "ai_experience",
    label: "AI Tools",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
    statements: [
      "I'm familiar with everyday AI tools (e.g. ChatGPT, Google Gemini, Snapchat AI).",
      "I'm familiar with coding AI tools (e.g. Codex, Replit, Loveable).",
      "I know what AI tools are and have a basic idea of how they work.",
      "I see learning AI tools as a skill worth developing seriously.",
      "I feel confident I could learn to use AI tools well.",
      "AI feels relevant to my future goals.",
    ],
    required: true,
  },
  {
    type: "text",
    id: "post_new_skill",
    label: "What is something you can do now that you couldn't do before this program?",
    required: true,
  },
  {
    type: "radio",
    id: "post_confidence_change",
    label: "Do you feel more confident using technology after this program?",
    options: [
      "Yes, a lot more confident",
      "A little more confident",
      "About the same",
      "Less confident than before",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "post_taught_others",
    label:
      "Did you have a chance to share or teach what you learned to someone else?",
    options: [
      "Yes — I taught or shared something with someone",
      "I tried, but it was hard to explain",
      "Not yet, but I want to",
      "No",
    ],
    required: true,
  },
  {
    type: "text",
    id: "post_more_help",
    label: "Do you want more help with anything?",
    required: false,
  },
  {
    type: "radio",
    id: "post_recommend",
    label: "Would you recommend this program to someone else?",
    options: ["Yes", "Maybe", "No"],
    required: true,
  },
  {
    type: "radio",
    id: "post_career_interest",
    label: "How do you feel about working in a career that involves technology?",
    options: [
      "More interested than before",
      "I was already interested and still am",
      "About the same",
      "Less interested than before",
    ],
    required: true,
  },
];

// ─── mid-program-spring-2026 (ATG mid-cohort) ────────────────────────────────
const MID_PROGRAM_SPRING_2026: SurveyQuestion[] = [
  {
    type: "radio",
    id: "mid_gender",
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
    id: "mid_race_ethnicity",
    label: "What is your race and/or ethnicity?",
    options: [
      "American Indian or Alaska Native",
      "Asian",
      "Black or African American",
      "Hispanic or Latino",
      "Middle Eastern or North African",
      "Native Hawaiian or Pacific Islander",
      "White",
      "Prefer not to say",
      "Other",
    ],
    required: true,
  },
  {
    type: "multi-select",
    id: "mid_languages",
    label: "What languages do you speak at home?",
    options: ["English", "Spanish", "Prefer not to say", "Other"],
    required: true,
  },
  {
    type: "radio",
    id: "mid_education_level",
    label: "What is the highest level of education you have completed?",
    options: [
      "Some high school (no diploma)",
      "High school diploma or GED",
      "Some college (no degree)",
      "Associate degree",
      "Bachelor's degree",
      "Graduate or professional degree",
      "Prefer not to say",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "mid_first_gen_college",
    label: "First-generation college student?",
    options: ["Yes", "No", "Not applicable", "Prefer not to say"],
    required: true,
  },
  {
    type: "multi-select",
    id: "mid_employment_status",
    label: "Current employment status",
    options: [
      "Employed full-time",
      "Employed part-time",
      "Unemployed",
      "Looking for work",
      "Not currently looking for work",
      "Student",
      "Prefer not to say",
      "Other",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "mid_household_income",
    label: "Household income range",
    options: [
      "Under $20,000",
      "$20,000 – $39,999",
      "$40,000 – $59,999",
      "$60,000 – $79,999",
      "$80,000 or more",
      "Prefer not to say",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "mid_disability",
    label: "Do you identify as a person with a disability?",
    options: ["Yes", "No", "Prefer not to say"],
    required: true,
  },
  {
    type: "dual-likert",
    id: "mindset_change",
    label: "Mindset, identity, and career direction",
    scale: LIKERT_1_5,
    beforeLabel: "BEFORE ATG started",
    nowLabel: "RIGHT NOW (week 4)",
    scaleAnchors: { low: "Strongly Disagree", high: "Strongly Agree" },
    statements: [
      "I can clearly describe the career path or type of role I'm working toward.",
      "I can tell my professional story — who I am, what I've done, where I'm headed.",
      "When I think about my next career steps, I know what to do first.",
      "I feel confident reaching out to someone I don't know to ask for a conversation or opportunity.",
      "I can talk about my value and accomplishments without downplaying them.",
      "I feel I belong in the career space I'm working toward.",
      "When I face a setback, I know how to reflect, adjust, and keep moving forward.",
      "I see myself as more than my athletic identity.",
    ],
    required: true,
  },
  {
    type: "dual-likert",
    id: "tech_confidence_change",
    label: "Tech confidence and direction",
    scale: LIKERT_1_5,
    beforeLabel: "BEFORE ATG started",
    nowLabel: "RIGHT NOW (week 4)",
    scaleAnchors: { low: "Not at all confident", high: "Very confident" },
    statements: [
      "I feel confident in my ability to learn technical material.",
      "I see myself succeeding in a tech career.",
      "I feel I belong in the tech industry.",
      "I can talk about my technical skills with someone who works in tech.",
      "I know how to keep building tech skills on my own.",
    ],
    required: true,
  },
  {
    type: "likert",
    id: "comptia_experience",
    label: "How the CompTIA course is going",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly disagree", high: "5 — Strongly agree" },
    statements: [
      "The pace of the CompTIA course works for me.",
      "I feel supported by the CompTIA instructor.",
      "The material feels relevant to a real tech career.",
      "I am able to keep up with the work outside of class time.",
    ],
    required: true,
  },
  {
    type: "text",
    id: "comptia_most_helpful",
    label: "What part of CompTIA has been the most helpful so far?",
    required: true,
  },
  {
    type: "text",
    id: "comptia_hardest",
    label: "What part has been hardest, confusing, or could be better?",
    required: true,
  },
  {
    type: "likert",
    id: "coaching_experience",
    label: "How the mindset & soft skills coaching is going",
    scale: LIKERT_1_5,
    scaleAnchors: { low: "1 — Strongly disagree", high: "5 — Strongly agree" },
    statements: [
      "The coaching sessions feel valuable to my growth.",
      "I leave the sessions thinking differently about my career or myself.",
      "The pace and structure of the sessions work for me.",
      "I feel comfortable being honest and open in these sessions.",
    ],
    required: true,
  },
  {
    type: "text",
    id: "coaching_powerful_moment",
    label: "Most powerful moment or shift from the coaching so far?",
    required: true,
  },
  {
    type: "text",
    id: "coaching_improvement",
    label: "What would make the coaching even more useful in the second half?",
    required: true,
  },
  {
    type: "radio",
    id: "one_on_one_rating",
    label: "How would you describe your 1:1 sessions with Ramon so far?",
    options: [
      "Extremely valuable — I look forward to them",
      "Valuable — they're helping",
      "Mixed — some sessions help more than others",
      "Not yet what I hoped — still figuring out how to use them",
      "I haven't been able to attend/haven't started",
      "Prefer not to say",
    ],
    required: true,
  },
  {
    type: "text",
    id: "one_on_one_memorable",
    label: "Something Ramon has said or done that has stuck with you?",
    required: false,
  },
  {
    type: "text",
    id: "one_on_one_improvement",
    label: "What would make your 1:1 time with Ramon more useful in the second half?",
    required: true,
  },
  {
    type: "text",
    id: "want_more_of",
    label: "What is one thing you want MORE of in the second half?",
    required: true,
  },
  {
    type: "multi-select",
    id: "support_needed",
    label: "What kind of support would make the biggest difference in the next 4 weeks?",
    options: [
      "More 1:1 time with a coach",
      "Peer accountability or study groups",
      "Help with exam prep/practice tests",
      "Resume or interview prep",
      "Connections to people working in tech",
      "Mental health or wellness resources",
      "Financial support information",
      "More flexibility in scheduling",
      "Other",
      "Prefer not to say",
    ],
    required: true,
  },
  {
    type: "text",
    id: "success_end_of_program",
    label: "What does success look like for you when After the Game ends?",
    required: true,
  },
  {
    type: "text",
    id: "success_12_months",
    label: "What does success look like for you 12 months after this program ends?",
    required: true,
  },
  {
    type: "text",
    id: "mid_anything_else",
    label: "Anything else you want us to know?",
    required: false,
  },
];

const SCHEMAS: Record<string, SurveyQuestion[]> = {
  "bcc-learner-intake": BCC_LEARNER_INTAKE,
  "bcc-workshop": BCC_WORKSHOP,
  "network-plus-post": NETWORK_PLUS_POST,
  "pre-survey-spring-2026": PRE_SURVEY_SPRING_2026,
  "post-survey-spring-2026": POST_SURVEY_SPRING_2026,
  "mid-program-spring-2026": MID_PROGRAM_SPRING_2026,
};

export function getSurveySchema(surveyId: string): SurveyQuestion[] | null {
  return SCHEMAS[surveyId] ?? null;
}

export const SHARED_DEMOGRAPHIC_IDS = [
  "gender",
  "race_ethnicity",
  "languages",
  "first_gen_college",
  "employment_status",
  "household_income",
  "disability",
  "education_level",
];

// Question ids that map to the same demographic concept across surveys (e.g.,
// the ATG mid-program survey prefixes its demographic ids with "mid_"). The
// All Surveys overview rolls these into one bucket per demographic.
export const DEMOGRAPHIC_ALIASES: Record<string, string> = {
  mid_gender: "gender",
  mid_race_ethnicity: "race_ethnicity",
  mid_languages: "languages",
  mid_first_gen_college: "first_gen_college",
  mid_employment_status: "employment_status",
  mid_household_income: "household_income",
  mid_disability: "disability",
  mid_education_level: "education_level",
};
