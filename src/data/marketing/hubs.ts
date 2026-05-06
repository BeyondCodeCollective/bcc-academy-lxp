export type HubStatus = "active" | "coming-soon";

export interface ForgeHub {
  id: string;
  name: string;
  city: string;
  state: string;
  neighborhood?: string;
  status: HubStatus;
  image: string;
}

export const forgeHubs: ForgeHub[] = [
  {
    id: "atl",
    name: "The Forge ATL",
    city: "Atlanta",
    state: "GA",
    neighborhood: "Midtown",
    status: "active",
    image: "/images/bcc/brand/forge-meeting.jpg",
  },
  {
    id: "nyc",
    name: "The Forge NYC",
    city: "New York",
    state: "NY",
    status: "coming-soon",
    image: "/images/bcc/brand/forge-collab.jpg",
  },
];
