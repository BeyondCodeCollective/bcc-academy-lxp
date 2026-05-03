export interface Pathway {
  id: string;
  name: string;
  stage: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  image: string;
}

export const pathways: Pathway[] = [
  {
    id: "explorers",
    name: "Explorers",
    stage: "K–12 youth",
    tagline: "Exposure → Confidence → Skill → Community",
    description:
      "Young learners who first encounter Beyond Code through Code Along, a Forge activation, or a community partner — and decide to keep going.",
    color: "#00BCD4",
    icon: "🔭",
    image: "/images/bcc/community/community-02.jpg",
  },
  {
    id: "builders",
    name: "Builders",
    stage: "Families learning together",
    tagline: "Trust → Safety → Value → Community",
    description:
      "Parents and caregivers who enter alongside their children. A whole-household tech journey, not a kids-only program.",
    color: "#0097A7",
    icon: "🛠",
    image: "/images/bcc/community/community-05.jpg",
  },
  {
    id: "launchers",
    name: "Launchers",
    stage: "Adults entering the workforce",
    tagline: "Awareness → Skills → Credential → Employment",
    description:
      "Catalyst programs combining technical skill-building, mentorship, and applied experience aligned to high-demand roles employers actually hire for.",
    color: "#E85D26",
    icon: "🚀",
    image: "/images/bcc/initiatives/catalysts.jpg",
  },
  {
    id: "pivoters",
    name: "Pivoters",
    stage: "Educators & career switchers",
    tagline: "Training → Certification → Delivery → Community",
    description:
      "Educators trained through Beyond Code who carry curriculum, tools, and practices back into schools, community settings, and second careers.",
    color: "#FF7043",
    icon: "🔄",
    image: "/images/bcc/community/community-03.jpg",
  },
  {
    id: "wisdom-leaders",
    name: "Wisdom Leaders",
    stage: "Learners 50+",
    tagline: "Lifelong access. Intergenerational rooms.",
    description:
      "Coding fundamentals and AI literacy for learners 50 and beyond — taught in rooms where middle schoolers and mid-career professionals sit at the same table.",
    color: "#B0A99F",
    icon: "🌟",
    image: "/images/bcc/initiatives/forge.jpg",
  },
];
