"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { facilitators } from "@/data/facilitators";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PhotoStrip from "@/components/PhotoStrip";
import PathwaysSection from "@/components/PathwaysSection";
import HumanInTheLoop from "@/components/HumanInTheLoop";
import ProofSection from "@/components/ProofSection";

const ISSUE = "NO. 04";
const VOLUME = "VOL. I";
const CITY = "ATLANTA, GA";

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
    <div className="border-b border-[var(--ink)] py-2 px-4 md:px-8 flex items-center justify-between v4-folio bg-[var(--paper)]">
      <span>BCC ACADEMY · {ISSUE}</span>
      <span className="hidden md:inline">{today.toUpperCase()}</span>
      <span>
        {CITY} · {time || "—"} EDT
      </span>
    </div>
  );
}

function SectionKicker({
  label,
  meta,
}: {
  label: string;
  meta?: string;
}) {
  return (
    <div className="px-4 md:px-8 pt-12 md:pt-16 pb-2 bg-[var(--paper)]">
      <div className="flex items-center gap-4">
        <span className="v4-kicker">[ {label} ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        {meta ? <span className="v4-kicker text-[var(--muted)]">{meta}</span> : null}
      </div>
    </div>
  );
}

function Lede() {
  return (
    <section className="bg-[var(--paper)] px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-10">
        <span className="v4-kicker">[ FROM THE EDITORS ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker">{VOLUME} · {ISSUE}</span>
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-10">
        <aside className="hidden md:block col-span-2 v4-margin space-y-4 sticky top-6 self-start">
          <p>↳ Continued from Hero, above.</p>
          <p>↳ See: Pathways, p. 2.</p>
          <p>↳ Photographs by the community.</p>
        </aside>

        <div className="col-span-12 md:col-span-10">
          <p className="v4-prose v4-dropcap max-w-[58ch]">
            Of every hundred adults who enroll in a self-paced online course,
            somewhere between three and fifteen finish. People do not fail
            because they aren&apos;t smart enough; they fail because no one is
            holding the rope on the other side. BCC Academy was built around a
            single, almost unfashionable belief: that{" "}
            <span className="v4-marker">a real person</span>, present and
            named, changes the math. What follows is a short tour of how the
            thing works.
          </p>
        </div>
      </div>
    </section>
  );
}

function PhotoStripFraming() {
  return (
    <div className="bg-[var(--paper)] px-4 md:px-8 pt-10 pb-2">
      <div className="flex items-center gap-4">
        <span className="v4-kicker">[ FIG. 01 · THE COMMUNITY ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker text-[var(--muted)]">SCROLL TO PAUSE</span>
      </div>
      <p className="v4-kicker mt-2 text-[var(--muted)] normal-case tracking-normal font-[family-name:var(--font-serif)] italic">
        From recent BCC events across Atlanta, Oakland, and online cohorts.
      </p>
    </div>
  );
}

function PeopleColumn() {
  return (
    <section className="bg-[var(--paper)] px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-6">
        <span className="v4-kicker">[ DEPT · OF · PEOPLE ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker">FOUR INTERVIEWS</span>
      </div>

      <h2 className="v4-headline text-[clamp(2.5rem,8vw,7rem)] mb-3">
        The facilitators.
      </h2>
      <p className="v4-prose max-w-[58ch] mb-14 md:mb-20 text-[var(--muted)] italic">
        Edited for length and clarity. Conducted between February and April
        2026, in person and over the phone.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
        {facilitators.map((f) => (
          <article key={f.id} className="grid grid-cols-12 gap-4">
            <figure className="col-span-4">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={f.image}
                  alt={f.name}
                  fill
                  sizes="(max-width: 768px) 33vw, 16vw"
                  className="object-cover grayscale"
                />
              </div>
            </figure>

            <div className="col-span-8">
              <span className="v4-kicker text-[var(--muted)]">
                {f.org.toUpperCase()} · {f.yearsInIndustry} YEARS IN
              </span>
              <h3 className="font-[family-name:var(--font-condensed)] text-2xl md:text-3xl uppercase tracking-tight leading-none mt-1 mb-3">
                {f.name}
              </h3>

              <p className="v4-prose text-[0.95rem] max-w-[36ch]">
                <span className="v4-kicker mr-2">Q.</span>
                What do you teach?
              </p>
              <p className="v4-prose text-[0.95rem] max-w-[36ch] mt-2">
                <span className="v4-kicker mr-2 text-[var(--cobalt)]">A.</span>
                <em className="font-normal not-italic">{f.teaches}.</em>{" "}
                {f.bio}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Dispatches() {
  const items = [
    {
      city: "ATLANTA",
      date: "MAY 14",
      head: "The Forge ATL Open House",
      body: "Doors open 6 PM at the West End studio. First fifty in the door eat. Bring a friend who's been thinking about it.",
    },
    {
      city: "VIRTUAL",
      date: "MAY 22",
      head: "Pathways Q&A · Pivoters Cohort",
      body: "An hour with three facilitators and a learner now six months into her first product role. Questions encouraged.",
    },
    {
      city: "ATLANTA",
      date: "JUN 03",
      head: "Wisdom Leaders Mixer",
      body: "Forty-five and over. Wine, light food, and an honest conversation about teaching what you already know.",
    },
    {
      city: "VIRTUAL",
      date: "JUN 18",
      head: "Builders Showcase",
      body: "The current Builders cohort presents what they've shipped. Public. Recorded. Bring your toughest questions.",
    },
  ];
  return (
    <section className="bg-[var(--paper)] px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-6">
        <span className="v4-kicker">[ DISPATCHES ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker">UPCOMING · 2026</span>
      </div>

      <h2 className="v4-headline text-[clamp(2.5rem,8vw,7rem)] mb-12 md:mb-16">
        From the city.
      </h2>

      <ul className="divide-y divide-[var(--ink)]">
        {items.map((it) => (
          <li
            key={it.head}
            className="grid grid-cols-12 gap-4 md:gap-10 py-6 md:py-8"
          >
            <div className="col-span-3 md:col-span-2 v4-kicker">
              {it.date}
              <br />
              <span className="text-[var(--muted)]">{it.city}</span>
            </div>
            <div className="col-span-9 md:col-span-7">
              <h3 className="font-[family-name:var(--font-condensed)] uppercase text-2xl md:text-3xl leading-none tracking-tight mb-2">
                {it.head}
              </h3>
              <p className="v4-prose text-[0.95rem] max-w-[52ch]">{it.body}</p>
            </div>
            <div className="col-span-12 md:col-span-3 md:text-right self-end">
              <Link
                href="#"
                className="v4-kicker text-[var(--cobalt)] underline underline-offset-4 decoration-1"
              >
                RSVP →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReaderLetters() {
  const qa = [
    {
      q: "Is this a coding bootcamp?",
      a: "No. We don't race anyone through twelve weeks. Pathways are paced by the learner and the facilitator together. Some finish in three months. Some take a year. Both are correct.",
    },
    {
      q: "What does it cost?",
      a: "The site, the quiz, and the orientation are free. Cohorts are sliding-scale, with a substantial number of fully-funded seats per term, prioritized for the communities BCC was built for.",
    },
    {
      q: "Do you actually mean ages 7 to 70?",
      a: "Yes. We have a nine-year-old in our Explorers cohort and a sixty-eight-year-old in Wisdom Leaders. They have, on occasion, been in the same Zoom.",
    },
    {
      q: "What if I've never written a line of code?",
      a: "Most of our Explorers haven't. The first week is about whether you like the work — not whether you're \u201Cgood at it.\u201D",
    },
    {
      q: "How do I start?",
      a: "Take the quiz. It's two minutes and produces a real recommendation, not a marketing email. From there, a facilitator gets in touch.",
    },
  ];
  return (
    <section className="bg-[var(--paper)] px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-6">
        <span className="v4-kicker">[ READER LETTERS ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker">FREQUENTLY ASKED</span>
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-10">
        <h2 className="v4-headline col-span-12 md:col-span-5 text-[clamp(2.5rem,7vw,6rem)] mb-6 md:mb-0 sticky top-6 self-start">
          You<br />asked<span className="text-[var(--cobalt)]">.</span>
        </h2>

        <ol className="col-span-12 md:col-span-7 space-y-10">
          {qa.map((item, i) => (
            <li key={item.q} className="border-t border-[var(--ink)] pt-6">
              <span className="v4-kicker text-[var(--muted)]">
                LETTER {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="v4-prose mt-2 max-w-[48ch]" style={{ fontWeight: 600 }}>
                <span className="v4-kicker mr-2">Q.</span>
                {item.q}
              </h3>
              <p className="v4-prose mt-3 max-w-[58ch]">
                <span className="v4-kicker mr-2 text-[var(--cobalt)]">A.</span>
                {item.a}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ClosingInvitation() {
  return (
    <section className="bg-[var(--paper)] px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-24 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-10">
        <span className="v4-kicker">[ THE INVITATION ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
      </div>

      <h2 className="v4-headline text-[clamp(3rem,11vw,11rem)] max-w-[14ch]">
        Two minutes.<br />
        <span className="text-[var(--cobalt)]">One real</span>{" "}
        recommendation<span className="text-[var(--cobalt)]">.</span>
      </h2>

      <div className="grid grid-cols-12 gap-6 md:gap-10 mt-10 md:mt-14 items-end">
        <div className="col-span-12 md:col-span-7">
          <p className="v4-prose max-w-[52ch]">
            The career quiz takes about as long as a coffee. It produces a
            pathway recommendation and the name of the facilitator who&apos;d
            be your point person. You can ignore both. Many people do, then
            come back six months later and start anyway.
          </p>
        </div>
        <div className="col-span-12 md:col-span-5 md:text-right">
          <Link
            href="/quiz"
            className="inline-block bg-[var(--cobalt)] text-[var(--paper)] px-6 py-4 v4-kicker text-sm hover:bg-[var(--ink)] transition-colors"
          >
            [ TAKE THE QUIZ → ]
          </Link>
          <p className="v4-kicker mt-4 text-[var(--muted)]">
            NO EMAIL REQUIRED TO SEE YOUR RESULT
          </p>
        </div>
      </div>
    </section>
  );
}

function Colophon() {
  return (
    <footer className="bg-[var(--paper)] px-4 md:px-8 py-12 md:py-16">
      <div className="grid grid-cols-12 gap-6 md:gap-10 v4-kicker">
        <div className="col-span-12 md:col-span-4">
          <p className="text-[var(--muted)]">COLOPHON</p>
          <p className="mt-3 normal-case tracking-normal font-[family-name:var(--font-serif)] text-[0.95rem] leading-relaxed text-[var(--ink)]">
            <em>BCC Academy</em> is set in Special Gothic Condensed (display)
            and Source Serif 4 (text). Captions and kickers in Space Mono.
            Built and shipped from Atlanta, Georgia.
          </p>
        </div>

        <nav className="col-span-6 md:col-span-3">
          <p className="text-[var(--muted)]">SECTIONS</p>
          <ul className="mt-3 space-y-1">
            <li><Link href="/pathways" className="hover:text-[var(--cobalt)]">PATHWAYS</Link></li>
            <li><Link href="/quiz" className="hover:text-[var(--cobalt)]">CAREER QUIZ</Link></li>
            <li><Link href="/" className="hover:text-[var(--cobalt)]">CURRENT EDITION</Link></li>
          </ul>
        </nav>

        <nav className="col-span-6 md:col-span-3">
          <p className="text-[var(--muted)]">DEPARTMENTS</p>
          <ul className="mt-3 space-y-1">
            <li>FACILITATORS</li>
            <li>HUBS</li>
            <li>EVENTS</li>
            <li>READER LETTERS</li>
          </ul>
        </nav>

        <div className="col-span-12 md:col-span-2 md:text-right">
          <p className="text-[var(--muted)]">MASTHEAD</p>
          <p className="mt-3">
            BCC ACADEMY
            <br />
            <span className="text-[var(--muted)]">EST. 2026</span>
          </p>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-[var(--ink)] flex items-center justify-between v4-folio">
        <span>© BEYOND CODE COLLECTIVE</span>
        <span className="hidden md:inline">{ISSUE} · {VOLUME}</span>
        <span>END · 30 ·</span>
      </div>
    </footer>
  );
}

export default function HomeV5() {
  return (
    <div className="theme-v5 min-h-screen">
      <Folio />
      <Header />
      <main>
        <Hero />
        <Lede />
        <PhotoStripFraming />
        <PhotoStrip />

        <SectionKicker label="FEATURE · 02" meta="A FIELD GUIDE" />
        <PathwaysSection />

        <SectionKicker label="THE FIGURE" meta="ON COMPLETION" />
        <HumanInTheLoop />

        <SectionKicker label="PHOTO ESSAY" meta="THE EARLY DAYS" />
        <ProofSection />

        <PeopleColumn />
        <Dispatches />
        <ReaderLetters />
        <ClosingInvitation />
      </main>
      <Colophon />
    </div>
  );
}
