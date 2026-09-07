import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PhotoStrip from "@/components/PhotoStrip";
import PathwaysSection from "@/components/PathwaysSection";
import HumanInTheLoop from "@/components/HumanInTheLoop";
import ProofSection from "@/components/ProofSection";
import OurPeopleSection from "@/components/OurPeopleSection";
import HubsSection from "@/components/HubsSection";
import EventsSection from "@/components/EventsSection";
import FAQSection from "@/components/FAQSection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
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
    </>
  );
}
