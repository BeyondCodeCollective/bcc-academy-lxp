"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { facilitators } from "@/data/facilitators";
import { pathways } from "@/data/pathways";

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
    <div className="theme-v4-folio border-b border-[var(--ink)] py-2 px-4 md:px-8 flex items-center justify-between v4-folio">
      <span>BCC QUARTERLY</span>
      <span className="hidden md:inline">{today.toUpperCase()}</span>
      <span>
        {CITY} · {time || "—"} EDT
      </span>
    </div>
  );
}

function Masthead() {
  return (
    <section className="px-4 md:px-8 pt-10 md:pt-14 pb-12 md:pb-20 border-b border-[var(--ink)]">
      {/* Top metadata row */}
      <div className="flex items-end justify-between v4-folio mb-8 md:mb-14">
        <span>{VOLUME}</span>
        <span className="text-center">
          A QUARTERLY ON HUMAN-FACILITATED LEARNING
          <br className="hidden md:inline" />
          <span className="md:hidden"> · </span>
          PUBLISHED BY BEYOND CODE COLLECTIVE
        </span>
        <span>{ISSUE}</span>
      </div>

      {/* The masthead */}
      <h1 className="v4-headline text-[clamp(4.5rem,18vw,18rem)] mb-6 md:mb-10">
        BCC<span className="text-[var(--cobalt)]">.</span>
      </h1>

      <div className="flex items-baseline justify-between v4-folio">
        <span>EST. 2026</span>
        <span>HOME OF BLACK GIRLS CODE</span>
        <span>$0 · ALWAYS</span>
      </div>
    </section>
  );
}

function CoverFeature() {
  return (
    <section className="px-4 md:px-8 pt-10 md:pt-16 pb-12 md:pb-20 border-b border-[var(--ink)]">
      {/* Kicker bar */}
      <div className="flex items-center gap-4 mb-6">
        <span className="v4-kicker">[ FEATURE · 01 ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker">CONTINUED ON P. 2</span>
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-10">
        {/* Headline takes the full width */}
        <h2 className="v4-headline col-span-12 text-[clamp(2.5rem,9vw,8.5rem)] mt-2 mb-6">
          The teacher is{" "}
          <em className="not-italic text-[var(--cobalt)]">a person</em>,
          <br />
          and the room <span className="v4-marker">remembers your name.</span>
        </h2>

        {/* Deck */}
        <p className="col-span-12 md:col-span-9 lg:col-span-8 text-[clamp(1.25rem,1.6vw,1.6rem)] leading-snug font-light italic text-[var(--muted)] mb-8 md:mb-10 max-w-[32ch]">
          On a Tuesday in Atlanta, a forty-six-year-old former line cook met the
          person who would walk her into her first software job. Neither of
          them was a chatbot.
        </p>

        {/* Byline */}
        <div className="col-span-12 md:col-span-3 lg:col-span-4 md:text-right v4-kicker self-end">
          BY THE EDITORS
          <br />
          <span className="text-[var(--muted)]">PHOTOGRAPHS BY THE COMMUNITY</span>
        </div>
      </div>

      {/* Lead photo */}
      <figure className="mt-10 md:mt-14 grid grid-cols-12 gap-6 md:gap-10">
        <div className="col-span-12 md:col-span-9 relative aspect-[16/10] overflow-hidden">
          <Image
            src="/images/bcc/community/community-04.jpg"
            alt="A BCC cohort gathered around a long table at The Forge ATL"
            fill
            sizes="(max-width: 768px) 100vw, 75vw"
            className="object-cover grayscale-[30%]"
            priority
          />
        </div>
        <figcaption className="col-span-12 md:col-span-3 v4-caption self-end">
          FIG. 01 · THE FORGE, ATL
          <em>
            A weekday cohort, mid-session. The room holds about thirty. Every
            learner has been called by name at least three times this hour.
          </em>
        </figcaption>
      </figure>
    </section>
  );
}

function Lede() {
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-24 border-b border-[var(--ink)]">
      <div className="grid grid-cols-12 gap-6 md:gap-10">
        {/* Marginalia */}
        <aside className="hidden md:block col-span-2 v4-margin space-y-4 sticky top-6 self-start">
          <p>
            ↳ This piece originally ran in <em>The Atlanta Tribune</em>,
            republished with permission.
          </p>
          <p>↳ See also: Pathways, p. 4.</p>
          <p>↳ Names of learners changed at their request.</p>
        </aside>

        {/* Body */}
        <div className="col-span-12 md:col-span-10">
          <p className="v4-prose v4-dropcap max-w-[58ch]">
            Of every hundred adults who enroll in a self-paced online coding
            course, somewhere between three and fifteen finish. The arithmetic
            is unkind to anyone who has ever tried it. People do not fail
            because they are not smart enough; they fail because no one is
            holding the rope on the other side. BCC Academy was built around a
            single, almost unfashionable belief: that{" "}
            <span className="v4-marker">a real person</span>, present and
            named, changes the math.
          </p>

          <div className="v4-prose v4-columns-2 max-w-[78ch] mt-10">
            <p>
              Every learner is paired with a facilitator who checks in weekly,
              re-shapes the plan when the plan needs re-shaping, and answers
              when texted at 9:47 on a Sunday night. The facilitators are paid,
              vetted, and astonishingly hard to recruit; the curriculum is
              cohort-based, taught in actual rooms when possible, on actual
              video when not.
            </p>
            <p>
              The early data is conspicuous. <strong>Of every hundred BCC
              learners, ninety-five finish the program they started.</strong>{" "}
              The number is not magic. It is the predictable consequence of
              someone, on the other end of the line, expecting you Tuesday at
              six.
            </p>
            <p>
              What follows is a short tour of how the thing works — the
              pathways, the people, the city block in Atlanta where most of it
              happens. We&apos;ve held the marketing voice at arm&apos;s
              length. The story is interesting enough on its own.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FigureStat() {
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-16 md:pb-28 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-10">
        <span className="v4-kicker">[ THE FIGURE ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
        <div className="col-span-12 md:col-span-7">
          <span className="v4-figure-number">95%</span>
        </div>
        <div className="col-span-12 md:col-span-5">
          <p className="v4-prose max-w-[40ch]">
            Of <strong>100 enrolled</strong> learners,{" "}
            <strong>95 finish</strong> the program they began. The
            self-paced industry sits between <strong>3 and 15</strong>.
          </p>
          <p className="v4-kicker mt-6 text-[var(--muted)]">
            SOURCE · BCC INTERNAL · INDUSTRY: 2024 ED-TECH COMPLETION SURVEYS
          </p>
        </div>
      </div>

      {/* Pull quote spread */}
      <blockquote className="mt-16 md:mt-24 max-w-[24ch] mx-auto text-center">
        <p className="v4-headline text-[clamp(2.25rem,6vw,5rem)]">
          &ldquo;Someone <em className="not-italic text-[var(--cobalt)]">remembers</em> if I miss a week.&rdquo;
        </p>
        <footer className="v4-kicker mt-8 text-[var(--muted)]">
          — A LEARNER, EXPLORERS COHORT
        </footer>
      </blockquote>
    </section>
  );
}

function PathwaysFeature() {
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
      <div className="flex items-center gap-4 mb-6">
        <span className="v4-kicker">[ FEATURE · 02 ]</span>
        <span className="flex-1 h-px bg-[var(--ink)]" />
        <span className="v4-kicker">A FIELD GUIDE</span>
      </div>

      <h2 className="v4-headline text-[clamp(2.5rem,8vw,7rem)] mb-12 md:mb-16">
        Five rooms.<br />
        <span className="text-[var(--muted)]">One door.</span>
      </h2>

      <p className="v4-prose max-w-[58ch] mb-12 md:mb-16">
        Every learner enters through the same quiz, then routes to one of five
        pathways. The names below describe a posture, not a syllabus. The
        syllabus is set by the facilitator, in conversation with you,
        during the first week.
      </p>

      <ol className="space-y-12 md:space-y-16">
        {pathways.map((p, i) => (
          <li
            key={p.id}
            className="grid grid-cols-12 gap-6 md:gap-10 items-start border-t border-[var(--ink)] pt-6 md:pt-8"
          >
            {/* Number */}
            <div className="col-span-2 md:col-span-1">
              <span className="v4-headline text-[clamp(2.5rem,5vw,4.5rem)] text-[var(--cobalt)] block">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            {/* Name + body */}
            <div className="col-span-10 md:col-span-6">
              <span className="v4-kicker text-[var(--muted)]">{p.stage.toUpperCase()}</span>
              <h3 className="v4-headline text-[clamp(1.75rem,3.5vw,3rem)] mt-2 mb-3">
                {p.name}.
              </h3>
              <p className="v4-prose max-w-[48ch]">{p.description}</p>
              <Link
                href="/pathways"
                className="inline-block v4-kicker mt-5 text-[var(--cobalt)] underline underline-offset-4 decoration-1"
              >
                READ MORE →
              </Link>
            </div>

            {/* Photo */}
            <figure className="col-span-12 md:col-span-5">
              <div className="relative aspect-[5/4] overflow-hidden">
                <Image
                  src={p.image}
                  alt={`${p.name} pathway: ${p.tagline}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover grayscale-[20%]"
                />
              </div>
              <figcaption className="v4-caption mt-3">
                FIG. {String(i + 2).padStart(2, "0")} · {p.name.toUpperCase()}
                <em>{p.tagline}.</em>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PeopleColumn() {
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
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
      body: "Doors open 6 PM at the West End studio. First fifty in the door eat. Bring a friend who&apos;s been thinking about it.",
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
      body: "The current Builders cohort presents what they&apos;ve shipped. Public. Recorded. Bring your toughest questions.",
    },
  ];
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
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
              <p
                className="v4-prose text-[0.95rem] max-w-[52ch]"
                dangerouslySetInnerHTML={{ __html: it.body }}
              />
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

function QandA() {
  const qa = [
    {
      q: "Is this a coding bootcamp?",
      a: "No. We don&apos;t race anyone through twelve weeks. Pathways are paced by the learner and the facilitator together. Some finish in three months. Some take a year. Both are correct.",
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
      q: "What if I&apos;ve never written a line of code?",
      a: "Most of our Explorers haven&apos;t. The first week is about whether you like the work — not whether you&apos;re &ldquo;good at it.&rdquo;",
    },
    {
      q: "How do I start?",
      a: "Take the quiz. It&apos;s two minutes and produces a real recommendation, not a marketing email. From there, a facilitator gets in touch.",
    },
  ];
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-20 border-b border-[var(--ink)]">
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
                <span dangerouslySetInnerHTML={{ __html: item.q }} />
              </h3>
              <p className="v4-prose mt-3 max-w-[58ch]">
                <span className="v4-kicker mr-2 text-[var(--cobalt)]">A.</span>
                <span dangerouslySetInnerHTML={{ __html: item.a }} />
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-24 border-b border-[var(--ink)]">
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
    <footer className="px-4 md:px-8 py-12 md:py-16">
      <div className="grid grid-cols-12 gap-6 md:gap-10 v4-kicker">
        <div className="col-span-12 md:col-span-4">
          <p className="text-[var(--muted)]">COLOPHON</p>
          <p className="mt-3 normal-case tracking-normal font-[family-name:var(--font-serif)] text-[0.95rem] leading-relaxed text-[var(--ink)]">
            <em>BCC Quarterly</em> is set in Special Gothic Condensed
            (display) and Source Serif 4 (text). Captions and kickers in Space
            Mono. Printed digitally in Atlanta, Georgia.
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

export default function HomeV4() {
  return (
    <div className="theme-v4 min-h-screen">
      <Folio />
      <Masthead />
      <CoverFeature />
      <Lede />
      <FigureStat />
      <PathwaysFeature />
      <PeopleColumn />
      <Dispatches />
      <QandA />
      <ClosingCTA />
      <Colophon />
    </div>
  );
}
