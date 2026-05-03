export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  format: "In-Person" | "Virtual" | "Hybrid";
  partner: string;
  pathway: string;
  pathwayColor: string;
  location?: string;
  description: string;
  url?: string;
  imageUrl?: string;
}

// Static fallback used when EVENTBRITE_API_TOKEN is not configured.
// Once the token is set in Vercel, src/lib/eventbrite.ts will replace this
// with the live Eventbrite organizer feed for Beyond Code Collective.
export const events: Event[] = [
  {
    id: "ai-fundamentals-wisdom-leaders",
    title: "AI Fundamentals for Wisdom Leaders — 4 Week Cohort (55+)",
    date: "2026-05-08",
    time: "2:00 PM – 4:00 PM EST",
    format: "In-Person",
    partner: "ATDC",
    pathway: "Wisdom Leaders",
    pathwayColor: "#B0A99F",
    location: "ATDC, Atlanta GA",
    description:
      "Free four-week cohort for learners 55 and beyond. Discover how AI works, then learn how to use it in everyday life — taught in a small, supportive room.",
    url: "https://www.eventbrite.com/o/beyond-code-collective-121150678633",
  },
];
