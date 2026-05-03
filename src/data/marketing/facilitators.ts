export interface Facilitator {
  id: string;
  name: string;
  title: string;
  org: string;
  teaches: string;
  course: string;
  yearsInIndustry: number;
  bio: string;
  pathway: string;
  image: string;
  /** When true, render a monogram tile instead of the image — flip to false once a high-res headshot is in. */
  monogram?: boolean;
}

export const facilitators: Facilitator[] = [
  {
    id: "kobie-joyner",
    name: "Kobie Joyner, M.Ed.",
    title: "Department Head, Network & Computer Technology",
    org: "Wake Technical Community College",
    teaches: "CompTIA Network+ & Infrastructure",
    course: "CompTIA Network+ — Catalyst Cohort",
    yearsInIndustry: 15,
    bio: "Kobie leads the Network and Computer Technology department at Wake Tech, where he oversees IT instruction across associate department heads, program directors, and 20+ faculty. He's a doctoral candidate in Community College Leadership at NC State and a Microsoft & Cisco-aligned educator. He teaches Catalyst's CompTIA Network+ pathway from where he actually works — running the program that trains the workforce.",
    pathway: "Launchers",
    image: "/images/bcc/instructors/kobie-joyner.webp",
    monogram: true,
  },
  {
    id: "jihan-johnston-mcglotten",
    name: "Jihan Johnston-McGlotten, M.Ed.",
    title: "Founder, The Hip-Hop EdTech Diva & BeatBotics",
    org: "Microsoft Learning Consultant · Ghost Gaming",
    teaches: "AI Literacy, Gaming & Creative Tech",
    course: "AI for Families & Creative Tech — The Forge",
    yearsInIndustry: 18,
    bio: "Jihan is an Afro-Latina EdTech entrepreneur based in the Atlanta Metro area, where she founded The Hip-Hop EdTech Diva — hands-on technology training that fuses hip-hop culture, gaming, VR, and music production. She's a Microsoft Learning Consultant training Georgia educators, a Saint Augustine's University 45 Under 45 honoree, and a regular FETC speaker. At The Forge, she leads AI literacy and creative-tech sessions for intergenerational rooms.",
    pathway: "Explorers",
    image: "/images/bcc/instructors/jihan-johnston-mcglotten.jpg",
    monogram: true,
  },
  {
    id: "angel-aviles",
    name: "Angel Aviles",
    title: "Program Designer & Lead Coach, MASS",
    org: "Beyond Code Collective",
    teaches: "Mindset, Soft Skills & Career Transformation",
    course: "MASS Wraparound — 8-week coaching cohort",
    yearsInIndustry: 25,
    bio: "Award-winning coach, author, and workforce development leader. Since starting her practice in 2011, Angel has coached hundreds in career and workforce development and reached thousands through her books and workshops focused on confidence, communication, and personal transformation. As program designer and lead coach of MASS, she brings a practice-based approach that helps emerging professionals turn potential into clarity, courage, and career momentum.",
    pathway: "Launchers",
    image: "/images/bcc/instructors/angel-aviles.png",
    monogram: true,
  },
];
