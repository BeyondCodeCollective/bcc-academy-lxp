// The bccacademy.io apex marketing home — composed from the components
// ported from the standalone marketing repo (bccacademy.io/montreal).
//
// Wrapped in .marketing-scope so the off-white background, body font,
// and display-font heading rule from globals.css apply ONLY here, not
// to the dashboard side.

import Header from "@/components/marketing/Header";
import Hero from "@/components/marketing/Hero";
import PhotoStrip from "@/components/marketing/PhotoStrip";
import PathwaysSection from "@/components/marketing/PathwaysSection";
import HumanInTheLoop from "@/components/marketing/HumanInTheLoop";
import ProofSection from "@/components/marketing/ProofSection";
import OurPeopleSection from "@/components/marketing/OurPeopleSection";
import HubsSection from "@/components/marketing/HubsSection";
import EventsSection from "@/components/marketing/EventsSection";
import FAQSection from "@/components/marketing/FAQSection";
import FinalCTA from "@/components/marketing/FinalCTA";
import Footer from "@/components/marketing/Footer";
import ChatButton from "@/components/marketing/ChatButton";

export function MarketingHome() {
  return (
    <div className="marketing-scope">
      <Header />
      <main>
        <Hero />
        <PhotoStrip />
        <PathwaysSection />
        <HumanInTheLoop />
        <ProofSection />
        <OurPeopleSection />
        <HubsSection />
        <EventsSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
      <ChatButton />
    </div>
  );
}
