export type PersonalityKey =
  | "fixer"
  | "architect"
  | "connector"
  | "creator"
  | "builder"
  | "maker"
  | "strategist"
  | "guardian"
  | "analyst"
  | "healer"
  | "educator"
  | "advocate";

export interface CareerResult {
  name: string;
  tagline: string;
  role: string;
  salary: { low: number; mid: number; high: number };
  timeToComplete: Record<number, number>;
  dayToDay: string[];
  forYouth: { items: string[]; cta: string };
  forAdult: { items: string[]; cta: string };
}

export interface AnswerMeta {
  icon: string;
  personality: PersonalityKey;
}

export interface QuestionData {
  question: string;
  answers: string[];
  meta: AnswerMeta[];
}

export const careers: Record<PersonalityKey, CareerResult> = {
  fixer: {
    name: "The Fixer",
    tagline: "You see problems. You solve them.",
    role: "IT Support Specialist",
    salary: { low: 45000, mid: 58000, high: 75000 },
    timeToComplete: { 2: 8, 4: 4, 6: 3 },
    dayToDay: [
      "Troubleshooting hardware and software issues",
      "Setting up and maintaining computer systems",
      "Helping users solve technical problems",
      "Managing network connectivity and security",
      "Documenting solutions and processes",
    ],
    forYouth: { items: ["Cybersafety Workshops", "Code Along Club", "Scratch Workshops"], cta: "Explore Courses" },
    forAdult: { items: ["CompTIA IT Fundamentals (ITF+)", "Workplace Fundamentals", "AI Fundamentals"], cta: "Explore Courses" },
  },
  architect: {
    name: "The Architect",
    tagline: "You see how everything connects.",
    role: "Data Analyst",
    salary: { low: 55000, mid: 75000, high: 95000 },
    timeToComplete: { 2: 10, 4: 5, 6: 4 },
    dayToDay: [
      "Analyzing data to find patterns and insights",
      "Building dashboards and visualizations",
      "Writing SQL queries and Python scripts",
      "Presenting findings to stakeholders",
      "Improving business decisions with data",
    ],
    forYouth: { items: ["The Happiness Code", "Intro to Data Science", "Python Workshops"], cta: "Explore Courses" },
    forAdult: { items: ["Data Science 101", "Data Science 102", "AI Fundamentals"], cta: "Explore Courses" },
  },
  connector: {
    name: "The Connector",
    tagline: "People are your superpower.",
    role: "Salesforce Administrator",
    salary: { low: 60000, mid: 81000, high: 105000 },
    timeToComplete: { 2: 7, 4: 4, 6: 3 },
    dayToDay: [
      "Managing and customizing Salesforce platforms",
      "Training teams on CRM best practices",
      "Building reports and dashboards for sales teams",
      "Automating business workflows",
      "Collaborating with stakeholders across departments",
    ],
    forYouth: { items: ["Code Along Club", "AI Explorers", "Workshops"], cta: "Explore Courses" },
    forAdult: { items: ["Salesforce Administration", "Zapier Fundamentals", "Workplace Fundamentals"], cta: "Explore Courses" },
  },
  creator: {
    name: "The Creator",
    tagline: "You make things people love to use.",
    role: "UX Designer",
    salary: { low: 62000, mid: 85000, high: 115000 },
    timeToComplete: { 2: 9, 4: 5, 6: 3 },
    dayToDay: [
      "Designing intuitive user interfaces",
      "Conducting user research and testing",
      "Creating wireframes and prototypes in Figma",
      "Collaborating with developers and product teams",
      "Improving products based on user feedback",
    ],
    forYouth: { items: ["P5 JavaScript: Code Art", "Scratch Animation", "Digital Vision Boards with AI"], cta: "Explore Courses" },
    forAdult: { items: ["Figma Make Fundamentals", "Webflow Fundamentals", "Designing with Canva"], cta: "Explore Courses" },
  },
  builder: {
    name: "The Builder",
    tagline: "You'd rather create your own path.",
    role: "Entrepreneur / Freelancer",
    salary: { low: 40000, mid: 75000, high: 150000 },
    timeToComplete: { 2: 6, 4: 3, 6: 2 },
    dayToDay: [
      "Building and launching your own products or services",
      "Finding and serving clients or customers",
      "Managing finances and business operations",
      "Marketing and growing your brand",
      "Wearing many hats and solving problems daily",
    ],
    forYouth: { items: ["Entrepreneurship 101", "Websites for Social Innovation", "Professional Website with WIX"], cta: "Explore Courses" },
    forAdult: { items: ["AI Tools for Small Business", "Digital Storytelling for Entrepreneurs", "Zapier Fundamentals"], cta: "Explore Courses" },
  },
  maker: {
    name: "The Maker",
    tagline: "You build things that matter.",
    role: "Creative Technologist",
    salary: { low: 42000, mid: 58000, high: 85000 },
    timeToComplete: { 2: 12, 4: 6, 6: 4 },
    dayToDay: [
      "Prototyping immersive experiences with VR and AR",
      "Building interactive projects that blend art and tech",
      "Designing and programming robots and sensors",
      "Collaborating on invention and maker projects",
      "Turning creative ideas into working prototypes",
    ],
    forYouth: { items: ["VR/AR Game Design Intensive", "Green Thumb Robotics", "Becoming an Inventor"], cta: "Explore Courses" },
    forAdult: { items: ["VR/AR Game Design Intensive", "AI Fundamentals", "Code Along Club"], cta: "Explore Courses" },
  },
  strategist: {
    name: "The Strategist",
    tagline: "You see the bigger picture.",
    role: "Project Manager",
    salary: { low: 65000, mid: 88000, high: 120000 },
    timeToComplete: { 2: 8, 4: 4, 6: 3 },
    dayToDay: [
      "Leading cross-functional teams to deliver projects",
      "Planning timelines, budgets, and resources",
      "Removing roadblocks for your team",
      "Communicating with stakeholders at all levels",
      "Turning chaos into organized progress",
    ],
    forYouth: { items: ["Code Along Club", "Entrepreneurship 101", "Workshops"], cta: "Explore Courses" },
    forAdult: { items: ["MASS (Mindset + Soft Skills)", "Workplace Fundamentals", "Zapier Fundamentals"], cta: "Explore Courses" },
  },
  guardian: {
    name: "The Guardian",
    tagline: "You keep things safe and secure.",
    role: "Cybersecurity Analyst",
    salary: { low: 70000, mid: 95000, high: 130000 },
    timeToComplete: { 2: 10, 4: 5, 6: 4 },
    dayToDay: [
      "Monitoring systems for security threats",
      "Investigating suspicious activity",
      "Implementing security protocols",
      "Training teams on security best practices",
      "Staying ahead of hackers and threats",
    ],
    forYouth: { items: ["Cybersafety (Ages 10-13)", "Cybersafety (Ages 14-18)", "Python Workshops"], cta: "Explore Courses" },
    forAdult: { items: ["CompTIA IT Fundamentals (ITF+)", "AI Fundamentals", "Digital Safety for Wisdom Leaders"], cta: "Explore Courses" },
  },
  analyst: {
    name: "The Detective",
    tagline: "You find the truth in the details.",
    role: "Data Storyteller",
    salary: { low: 58000, mid: 78000, high: 105000 },
    timeToComplete: { 2: 9, 4: 5, 6: 3 },
    dayToDay: [
      "Uncovering trends and patterns in real-world data",
      "Turning raw numbers into compelling narratives",
      "Building visualizations that make data click",
      "Connecting cultural context to data insights",
      "Presenting findings that drive action",
    ],
    forYouth: { items: ["The Happiness Code", "Intro to Data Science", "Python + Tech Stats"], cta: "Explore Courses" },
    forAdult: { items: ["Data Science 101", "Data Science 102", "AI Fundamentals"], cta: "Explore Courses" },
  },
  healer: {
    name: "The Healer",
    tagline: "You help people feel better.",
    role: "AI for Social Impact Specialist",
    salary: { low: 48000, mid: 65000, high: 90000 },
    timeToComplete: { 2: 10, 4: 5, 6: 4 },
    dayToDay: [
      "Applying AI tools to solve community challenges",
      "Training others to use technology safely and effectively",
      "Designing tech solutions that center human needs",
      "Bridging the gap between emerging tech and everyday people",
      "Making sure AI serves communities, not just corporations",
    ],
    forYouth: { items: ["AI Explorers", "Coding for Change", "Code Along Club"], cta: "Explore Courses" },
    forAdult: { items: ["AI Fundamentals", "AI Tools for Classrooms", "Digital Safety for Wisdom Leaders"], cta: "Explore Courses" },
  },
  educator: {
    name: "The Guide",
    tagline: "You light the path for others.",
    role: "Technical Trainer / Instructional Designer",
    salary: { low: 52000, mid: 72000, high: 95000 },
    timeToComplete: { 2: 8, 4: 4, 6: 3 },
    dayToDay: [
      "Creating engaging learning experiences",
      "Breaking down complex topics into simple lessons",
      "Coaching individuals to reach their potential",
      "Developing training materials and courses",
      "Watching people grow because of your guidance",
    ],
    forYouth: { items: ["Code Along Club", "AI Explorers", "Scratch: Interactive Story"], cta: "Explore Courses" },
    forAdult: { items: ["AI Tools for Classrooms", "Code Along Club", "AI Fundamentals"], cta: "Explore Courses" },
  },
  advocate: {
    name: "The Advocate",
    tagline: "You fight for what matters.",
    role: "Community Tech Coordinator",
    salary: { low: 45000, mid: 62000, high: 85000 },
    timeToComplete: { 2: 6, 4: 3, 6: 2 },
    dayToDay: [
      "Bringing technology access to underserved communities",
      "Running digital literacy initiatives",
      "Connecting people with resources and opportunities",
      "Advocating for equitable tech access",
      "Making real impact in people's lives",
    ],
    forYouth: { items: ["Coding for Change: Activism through Animation", "Code Along Club", "Climate Games"], cta: "Explore Courses" },
    forAdult: { items: ["AI Tools for Classrooms", "Digital Safety for Wisdom Leaders", "AI Fundamentals"], cta: "Explore Courses" },
  },
};

export const questions: QuestionData[] = [
  {
    question: "Your friend's computer dies right before a big deadline. What do you do?",
    answers: [
      "Already grabbing my tools\u2014I got this",
      "Let me check what's actually wrong first",
      "I know a guy who can help",
      "Time to make this crisis look organized",
      "This wouldn't have happened with better security...",
      "Let me walk you through fixing it yourself",
    ],
    meta: [
      { icon: "wrench", personality: "fixer" },
      { icon: "magnifying-glass", personality: "analyst" },
      { icon: "device-mobile", personality: "connector" },
      { icon: "target", personality: "strategist" },
      { icon: "shield", personality: "guardian" },
      { icon: "star", personality: "educator" },
    ],
  },
  {
    question: "You just won $10,000. What's your first thought?",
    answers: [
      "Finally upgrade my setup",
      "Invest it and watch it grow",
      "Throw a party for everyone I love",
      "Start that business I've been dreaming about",
      "Donate to causes that matter",
      "Pay for someone's education or training",
    ],
    meta: [
      { icon: "desktop", personality: "fixer" },
      { icon: "chart-line-up", personality: "architect" },
      { icon: "party", personality: "connector" },
      { icon: "rocket", personality: "builder" },
      { icon: "hand-fist", personality: "advocate" },
      { icon: "graduation-cap", personality: "educator" },
    ],
  },
  {
    question: "What would make you quit a job on the spot?",
    answers: [
      "Being forced to ship something broken",
      "Leadership ignoring the data",
      "A toxic team that doesn't have each other's backs",
      "Zero creative freedom",
      "Seeing people get hurt because corners were cut",
      "Working for a company that hurts communities",
    ],
    meta: [
      { icon: "heart-break", personality: "fixer" },
      { icon: "eye-slash", personality: "analyst" },
      { icon: "prohibit", personality: "connector" },
      { icon: "paint-brush", personality: "creator" },
      { icon: "warning", personality: "guardian" },
      { icon: "fire", personality: "advocate" },
    ],
  },
  {
    question: "You're leading a group project. What's your move?",
    answers: [
      "Jump in and handle the hardest technical part",
      "Create a clear plan so everyone knows their role",
      "Make sure everyone feels heard and included",
      "Focus on making the final product look amazing",
      "Research everything so we don't make mistakes",
      "Make sure we're building something that helps people",
    ],
    meta: [
      { icon: "lightning", personality: "maker" },
      { icon: "clipboard", personality: "strategist" },
      { icon: "handshake", personality: "connector" },
      { icon: "sparkle", personality: "creator" },
      { icon: "books", personality: "analyst" },
      { icon: "heart", personality: "healer" },
    ],
  },
  {
    question: "It's 2 AM and you can't sleep. What are you doing?",
    answers: [
      "Down a rabbit hole learning something new",
      "Planning my next big move",
      "Texting friends or scrolling socials",
      "Working on a creative project",
      "Worrying about all the things that could go wrong",
      "Thinking about how to make tomorrow better for someone",
    ],
    meta: [
      { icon: "brain", personality: "analyst" },
      { icon: "moon", personality: "strategist" },
      { icon: "chat-circle", personality: "connector" },
      { icon: "palette", personality: "creator" },
      { icon: "shield", personality: "guardian" },
      { icon: "heart", personality: "advocate" },
    ],
  },
  {
    question: "What compliment hits different for you?",
    answers: [
      '"You always figure things out"',
      '"You see things nobody else sees"',
      '"Everyone loves working with you"',
      '"This is beautiful"',
      '"You made this from scratch?!"',
      '"You changed my life"',
    ],
    meta: [
      { icon: "brain", personality: "fixer" },
      { icon: "eye", personality: "architect" },
      { icon: "handshake", personality: "connector" },
      { icon: "smiley", personality: "creator" },
      { icon: "lightbulb", personality: "builder" },
      { icon: "star", personality: "educator" },
    ],
  },
  {
    question: "Pick your superpower.",
    answers: [
      "Fix anything with one touch",
      "See 10 years into the future",
      "Make anyone trust you instantly",
      "Create anything you imagine",
      "Be immune to all threats",
      "Heal anyone's pain",
    ],
    meta: [
      { icon: "hand-waving", personality: "fixer" },
      { icon: "eye", personality: "architect" },
      { icon: "fingerprint-simple", personality: "connector" },
      { icon: "sparkle", personality: "creator" },
      { icon: "shield", personality: "guardian" },
      { icon: "heart", personality: "healer" },
    ],
  },
];
