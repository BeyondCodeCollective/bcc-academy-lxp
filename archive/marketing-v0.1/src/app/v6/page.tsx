"use client";

import { useEffect, useState } from "react";

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

const ISSUE = "NO. 04";

function useAtlantaClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Folio() {
  const time = useAtlantaClock();
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  return (
    <div className="border-b border-[var(--ink)] py-2 px-4 md:px-8 flex items-center justify-between gap-3 v4-folio bg-[var(--paper)]">
      <span className="truncate">
        BCC <span className="hidden sm:inline">ACADEMY · </span>
        {ISSUE}
      </span>
      <span className="hidden lg:inline truncate">{today.toUpperCase()}</span>
      <span className="truncate text-right">
        <span className="sm:hidden">ATL</span>
        <span className="hidden sm:inline">ATLANTA, GA</span>
        {" · "}{time || "—"} EDT
      </span>
    </div>
  );
}

function Kicker({
  label,
  meta,
  fig,
}: {
  label: string;
  meta?: string;
  fig?: string;
}) {
  return (
    <div className="px-4 md:px-8 pt-10 md:pt-14 pb-2 bg-[var(--paper)]">
      {/* Label + rule + meta — wraps to two rows on narrow screens */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-4">
        <span className="v4-kicker shrink-0">[ {label} ]</span>
        <span className="hidden md:block flex-1 h-px bg-[var(--ink)]" />
        {meta ? (
          <span className="v4-kicker text-[var(--muted)] shrink-0">{meta}</span>
        ) : null}
      </div>
      {/* On mobile, the rule moves below since md:block is the only place we render it.
          Add a full-width rule for mobile that sits below label/meta. */}
      <span className="block md:hidden h-px bg-[var(--ink)] mt-2" />
      {fig ? (
        <p className="v4-kicker mt-3 text-[var(--muted)] normal-case tracking-normal font-[family-name:var(--font-body)] text-xs leading-snug">
          {fig}
        </p>
      ) : null}
    </div>
  );
}

function Colophon() {
  return (
    <div className="border-t border-[var(--ink)] bg-[var(--paper)] px-4 md:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 v4-folio">
      <span>
        SET IN <span className="text-[var(--cobalt)]">SPECIAL GOTHIC CONDENSED</span> · GT STANDARD · SPACE MONO
      </span>
      <span className="text-[var(--muted)]">
        BUILT IN ATLANTA · © BEYOND CODE COLLECTIVE
      </span>
      <span>END · 30 ·</span>
    </div>
  );
}

export default function HomeV6() {
  return (
    <div className="theme-v6 min-h-screen">
      <Folio />
      <Header />
      <main>
        <Hero />

        <Kicker
          label="FIG. 01"
          meta="THE COMMUNITY"
          fig="From recent events across Atlanta, Oakland, and online cohorts. Hover to pause."
        />
        <PhotoStrip />

        <Kicker label="FEATURE · 02" meta="A FIELD GUIDE TO THE PATHWAYS" />
        <PathwaysSection />

        <Kicker label="THE FIGURE" meta="ON COMPLETION" />
        <HumanInTheLoop />

        <Kicker label="FIG. 02" meta="EARLY DAYS" fig="A photo essay from the first cohorts." />
        <ProofSection />

        <Kicker label="DEPT · OF · PEOPLE" meta="THE FACILITATORS" />
        <OurPeopleSection />

        <Kicker label="DISPATCHES" meta="HUBS & UPCOMING" />
        <HubsSection />
        <EventsSection />

        <Kicker label="READER LETTERS" meta="FREQUENTLY ASKED" />
        <FAQSection />

        <FinalCTA />
      </main>
      <Footer />
      <Colophon />
    </div>
  );
}
