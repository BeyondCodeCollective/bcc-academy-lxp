export type SessionTrack = "comptia" | "salesforce" | "mass" | "pmf" | "google";

export interface ClassSession {
  id: string;
  title: string;
  subtitle: string;
  schedule: string;
  track: SessionTrack;
  joinUrl: string;
  image: string;
  status: "live" | "upcoming";
  nextDate: string;
}

export const classSessions: ClassSession[] = [
  {
    id: "comptia-net-plus",
    title: "CompTIA Network+",
    subtitle: "Weekly Live Sessions",
    schedule: "Wednesdays · 5:30–6:30 PM PT",
    track: "comptia",
    joinUrl: "#sessions",
    image: "/images/bcc/brand/forge-meeting.jpg",
    status: "upcoming",
    nextDate: "2026-05-13T17:30:00-07:00",
  },
  {
    id: "comptia-a-plus",
    title: "CompTIA A+",
    subtitle: "Weekly Live Sessions",
    schedule: "Tuesdays · 6:00–7:00 PM PT",
    track: "comptia",
    joinUrl: "#sessions",
    image: "/images/bcc/community/community-06.jpg",
    status: "upcoming",
    nextDate: "2026-05-12T18:00:00-07:00",
  },
  {
    id: "mass-coaching",
    title: "MASS Coaching",
    subtitle: "Weekly Live Sessions",
    schedule: "Thursdays · 5:00–6:00 PM PT",
    track: "mass",
    joinUrl: "#sessions",
    image: "/images/bcc/brand/forge-collab.jpg",
    status: "upcoming",
    nextDate: "2026-05-07T17:00:00-07:00",
  },
  {
    id: "salesforce-admin",
    title: "Salesforce Admin",
    subtitle: "Weekly Live Sessions",
    schedule: "Saturdays · 10:00–11:30 AM PT",
    track: "salesforce",
    joinUrl: "#sessions",
    image: "/images/bcc/brand/friends-sky.jpg",
    status: "upcoming",
    nextDate: "2026-05-09T10:00:00-07:00",
  },
];

export const trackLabels: Record<SessionTrack, string> = {
  comptia: "CompTIA",
  salesforce: "Salesforce",
  mass: "MASS",
  pmf: "Project Mgmt",
  google: "Google",
};
