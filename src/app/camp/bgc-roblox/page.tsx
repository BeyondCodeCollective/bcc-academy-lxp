import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BGC Roblox Virtual Summer Bootcamp 2026",
  description:
    "This Summer, She Won't Just Play Roblox — She'll Build It. A 3-day virtual bootcamp July 7–9 for girls ages 10–15.",
};

const CAMP_DAYS = [
  {
    day: "Day 1 — July 7, Tuesday",
    title: "Build Your First World",
    description:
      "Jump into Roblox Studio and learn game design fundamentals. You'll design and build your own interactive 3D environment from scratch.",
  },
  {
    day: "Day 2 — July 8, Wednesday",
    title: "Script It With Lua",
    description:
      "Bring your world to life using Lua — the same scripting language behind millions of Roblox games. Add rules, mechanics, and objectives.",
  },
  {
    day: "Day 3 — July 9, Thursday",
    title: "Publish & Showcase",
    description:
      "Polish your game assets, publish your project, and present it to the group. You leave with something real that you built yourself.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    label: "Register",
    detail: "Sign up through the BGC event page — your seat is confirmed once you're on the list.",
  },
  {
    step: "02",
    label: "Watch your inbox",
    detail: "You'll get a confirmation email with your login link for the BCC Academy portal. No password needed.",
  },
  {
    step: "03",
    label: "Show up on camp day",
    detail: "Click the link in your email, log in, and the live session opens directly inside the portal. No Zoom app required.",
  },
];

export default function BGCRobloxCampPage() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: "#0f0620", color: "#fff" }}
    >
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          {/* BGC wordmark */}
          <span
            className="font-bold text-sm uppercase tracking-[0.2em]"
            style={{ color: "#D946EF", fontFamily: "var(--font-bricolage)" }}
          >
            Black Girls Code
          </span>
          <span style={{ color: "#ffffff22" }}>×</span>
          <span
            className="font-bold text-sm uppercase tracking-[0.2em]"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-bricolage)" }}
          >
            BCC Academy
          </span>
        </div>
        <Link
          href="/login"
          className="text-xs font-medium uppercase tracking-widest transition-colors"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Student Login →
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center md:px-12">
        {/* Badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em]"
          style={{ background: "rgba(217,70,239,0.15)", color: "#D946EF", border: "1px solid rgba(217,70,239,0.3)" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D946EF]" />
          Virtual · 3-Day Mini Camp · Roblox Studio
        </div>

        <h1
          className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-bricolage)" }}
        >
          She won&apos;t just{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #9333EA 0%, #D946EF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            play Roblox.
          </span>
          <br />
          She&apos;ll build it.
        </h1>

        <p
          className="mt-6 max-w-xl text-base leading-relaxed md:text-lg"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          A 3-day virtual bootcamp for girls ages 10–15. Learn game design,
          Lua scripting, and 3D world-building with Roblox Studio —
          then publish a game you built yourself.
        </p>

        <p
          className="mt-3 text-sm font-semibold"
          style={{ color: "rgba(217,70,239,0.8)" }}
        >
          July 7–9, 2026 &middot; 10 AM – 3 PM daily &middot; Virtual on Zoom
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="https://community.wearebgc.org/networks/events/175648"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #9333EA, #D946EF)",
              color: "#fff",
              minHeight: "44px",
            }}
          >
            Register on BGC →
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)",
              minHeight: "44px",
            }}
          >
            Already registered? Log in
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 2rem" }} />

      {/* 3-Day Schedule */}
      <section className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "#9333EA" }}
          >
            Camp Schedule
          </p>
          <h2
            className="mb-12 text-2xl font-bold tracking-tight md:text-3xl"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Three days, three milestones.
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {CAMP_DAYS.map((item, i) => (
              <div
                key={i}
                className="p-6"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p
                  className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "#D946EF" }}
                >
                  {item.day}
                </p>
                <h3
                  className="mb-3 text-lg font-bold leading-tight"
                  style={{ fontFamily: "var(--font-bricolage)" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 2rem" }} />

      {/* What they'll learn */}
      <section className="px-6 py-20 md:px-12" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#9333EA" }}>
                What Participants Learn
              </p>
              <h2 className="mb-8 text-2xl font-bold tracking-tight md:text-3xl" style={{ fontFamily: "var(--font-bricolage)" }}>
                Real skills.<br />Real confidence.
              </h2>
              <ul className="space-y-3">
                {[
                  "Game design fundamentals using Roblox Studio",
                  "Intro to Lua — the scripting language used in Roblox",
                  "Design and build interactive 3D worlds and gameplay mechanics",
                  "Create game assets: environments, characters, rules, and objectives",
                  "Teamwork, leadership, and creative problem-solving",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <span className="mt-0.5 shrink-0 text-[#D946EF]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#9333EA" }}>
                What They Walk Away With
              </p>
              <h2 className="mb-8 text-2xl font-bold tracking-tight md:text-3xl" style={{ fontFamily: "var(--font-bricolage)" }}>
                More than a<br />certificate.
              </h2>
              <ul className="space-y-3">
                {[
                  "Skills to continue creating and publishing games on Roblox",
                  "A clearer picture of careers in game design, engineering, and digital creation",
                  "A published game they built from scratch",
                  "New friendships, mentors, and confidence to keep building",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <span className="mt-0.5 shrink-0 text-[#D946EF]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 2rem" }} />

      {/* How it works */}
      <section className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "#9333EA" }}
          >
            How It Works
          </p>
          <h2
            className="mb-12 text-2xl font-bold tracking-tight md:text-3xl"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Simple from start to finish.
          </h2>

          <div className="grid gap-px" style={{ background: "rgba(255,255,255,0.06)" }}>
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={i}
                className="flex gap-6 p-6 md:p-8"
                style={{ background: "#0f0620" }}
              >
                <span
                  className="shrink-0 text-4xl font-bold tabular-nums leading-none"
                  style={{
                    fontFamily: "var(--font-bricolage)",
                    color: "rgba(147,51,234,0.3)",
                  }}
                >
                  {item.step}
                </span>
                <div>
                  <h3
                    className="mb-1 text-base font-semibold"
                    style={{ fontFamily: "var(--font-bricolage)" }}
                  >
                    {item.label}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What to expect / details strip */}
      <section
        className="px-6 py-14 md:px-12"
        style={{ background: "rgba(147,51,234,0.1)", borderTop: "1px solid rgba(147,51,234,0.2)", borderBottom: "1px solid rgba(147,51,234,0.2)" }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {[
              { label: "Dates", value: "July 7–9, 2026" },
              { label: "Time", value: "10 AM – 3 PM daily" },
              { label: "Ages", value: "10–15" },
              { label: "Tools", value: "Roblox Studio + Lua" },
            ].map((item) => (
              <div key={item.label}>
                <p
                  className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "rgba(217,70,239,0.7)" }}
                >
                  {item.label}
                </p>
                <p className="text-base font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-24 text-center md:px-12">
        <div className="mx-auto max-w-xl">
          <h2
            className="mb-4 text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Ready to build something real?
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Only 35 spots available at $25/student. Register on the BGC event page
            to hold your seat. Need financial assistance?{" "}
            <a
              href="mailto:community@wearebgc.org"
              className="underline transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Email us about scholarships.
            </a>
          </p>
          <a
            href="https://community.wearebgc.org/networks/events/175648"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold uppercase tracking-wider transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #9333EA, #D946EF)",
              color: "#fff",
              minHeight: "48px",
            }}
          >
            Register on BGC →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8 md:px-12"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            © 2026 Black Girls Code · Powered by BCC Academy
          </p>
          <Link
            href="/login"
            className="text-xs transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Student portal →
          </Link>
        </div>
      </footer>
    </div>
  );
}
