export type HubStatus = "active" | "coming-soon";

export interface BeyondCodeCenter {
  id: string;
  name: string;
  city: string;
  state: string;
  neighborhood?: string;
  status: HubStatus;
  image: string;
}

export const beyondCodeCenters: BeyondCodeCenter[] = [
  {
    id: "atl",
    name: "Beyond Code Centers ATL",
    city: "Atlanta",
    state: "GA",
    neighborhood: "Midtown",
    status: "active",
    image: "/images/bcc/brand/forge-meeting.jpg",
  },
  {
    id: "nyc",
    name: "Beyond Code Centers NYC",
    city: "New York",
    state: "NY",
    status: "coming-soon",
    image: "/images/bcc/brand/forge-collab.jpg",
  },
];
