// The bccacademy.io apex marketing home — composed from the components
// ported from the standalone marketing repo (bccacademy.io/montreal).
//
// Wrapped in .marketing-scope so the off-white background, body font,
// and display-font heading rule from globals.css apply ONLY here, not
// to the dashboard side.

import dynamic from "next/dynamic";
import Header from "@/components/marketing/Header";
import Hero from "@/components/marketing/Hero";
import PhotoStrip from "@/components/marketing/PhotoStrip";
import { getEvents } from "@/lib/eventbrite";

const ProgramsSection = dynamic(() => import("@/components/marketing/ProgramsSection"));
const HumanInTheLoop = dynamic(() => import("@/components/marketing/HumanInTheLoop"));
const ProofSection = dynamic(() => import("@/components/marketing/ProofSection"));
const OurPeopleSection = dynamic(() => import("@/components/marketing/OurPeopleSection"));
const HubsSection = dynamic(() => import("@/components/marketing/HubsSection"));
const LiveSessionsSection = dynamic(() => import("@/components/marketing/LiveSessionsSection"));
const EventsSection = dynamic(() => import("@/components/marketing/EventsSection"));
const FAQSection = dynamic(() => import("@/components/marketing/FAQSection"));
const FinalCTA = dynamic(() => import("@/components/marketing/FinalCTA"));
const Footer = dynamic(() => import("@/components/marketing/Footer"));
const ChatButton = dynamic(() => import("@/components/marketing/ChatButton"));

export async function MarketingHome() {
  const events = await getEvents();

  return (
    <div className="marketing-scope">
      <Header />
      <main>
        <Hero />
        <PhotoStrip />
        <ProgramsSection />
        <HumanInTheLoop />
        <ProofSection />
        <OurPeopleSection />
        <HubsSection />
        <LiveSessionsSection />
        <EventsSection events={events} />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
      <ChatButton />
    </div>
  );
}
