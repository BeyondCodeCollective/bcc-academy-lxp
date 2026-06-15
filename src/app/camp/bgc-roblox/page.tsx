import type { Metadata } from "next";
import { CampEmailForm } from "./camp-email-form";
import { CampHeaderCta } from "./camp-header-cta";

export const metadata: Metadata = {
  title: "BGC × BCC Academy — Roblox Virtual Bootcamp 2026",
  description: "A 3-day virtual bootcamp for girls ages 10–15. Build a real game with Roblox Studio and Lua. July 7–9, 2026.",
};

const DAYS = [
  { label: "Day 1 · July 7", title: "Build Your First World" },
  { label: "Day 2 · July 8", title: "Script It With Lua" },
  { label: "Day 3 · July 9", title: "Publish & Showcase" },
];

// Roblox official wordmark — geometric bold sans, matches brand typography
function RobloxWordmark({ height = 24 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 140 36"
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Roblox"
    >
      <rect width="140" height="36" rx="0" fill="none" />
      <text
        x="4"
        y="27"
        fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="28"
        letterSpacing="-1"
        fill="#1a1a1a"
      >
        Roblox
      </text>
    </svg>
  );
}

export default function BGCRobloxCampPage() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col md:flex-row"
      style={{ backgroundColor: "#f5f5f7", color: "#1a1a1a" }}
    >
      {/* ── Left: content panel (48%) ── */}
      <div className="flex flex-col flex-1 md:min-h-[100dvh]">

        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-5 md:px-12"
          style={{ borderBottom: "1px solid #1a1a1a0d" }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#1a1a1a55", fontFamily: "var(--font-bricolage)" }}
          >
            BCC Academy
          </span>
          <CampHeaderCta />
        </header>

        {/* Main content */}
        <main className="flex flex-1 flex-col justify-center px-8 py-12 md:px-12">
          <div style={{ maxWidth: "460px" }}>

            {/* Eyebrow */}
            <p
              className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "#7C3AED" }}
            >
              July 7–9, 2026 &middot; Virtual &middot; Ages 10–15
            </p>

            {/* Headline */}
            <h1
              className="font-bold leading-[1.0] tracking-tight"
              style={{
                fontFamily: "var(--font-bricolage)",
                fontSize: "clamp(34px, 4vw, 48px)",
                color: "#1a1a1a",
              }}
            >
              She won&apos;t just<br />
              play Roblox.<br />
              She&apos;ll build it.
            </h1>

            {/* Sub */}
            <p
              className="mt-4 text-sm leading-relaxed"
              style={{ color: "#1a1a1a70", maxWidth: "38ch" }}
            >
              Game design, Lua scripting, and 3D world-building —
              three days, one published game she made herself.
            </p>

            {/* Email form */}
            <div className="mt-8">
              <p
                className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                style={{ color: "#1a1a1a55" }}
              >
                Already registered? Get your portal link
              </p>
              <CampEmailForm />
            </div>

            {/* Divider */}
            <div className="mt-10 mb-7" style={{ height: "1px", background: "#1a1a1a12" }} />

            {/* Schedule — larger text */}
            <div className="space-y-4">
              {DAYS.map((item) => (
                <div key={item.label} className="flex items-baseline gap-5">
                  <span
                    className="text-xs font-medium uppercase tracking-[0.1em] shrink-0"
                    style={{ color: "#1a1a1a44", minWidth: "104px" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "#1a1a1a", fontSize: "16px" }}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Not registered */}
            <p className="mt-8 text-sm" style={{ color: "#1a1a1a55" }}>
              Not registered yet?{" "}
              <a
                href="https://community.wearebgc.org/networks/events/175648"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline underline-offset-2"
                style={{ color: "#7C3AED" }}
              >
                Register on the BGC event page →
              </a>
            </p>

          </div>
        </main>

        {/* Partner logos — bottom of content panel */}
        <div
          className="px-8 py-6 md:px-12"
          style={{ borderTop: "1px solid #1a1a1a0d" }}
        >
          <p
            className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: "#1a1a1a38" }}
          >
            Presented in partnership with
          </p>
          <div className="flex items-center gap-6">
            {/* Real BGC logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bgc-logo.svg"
              alt="Black Girls Code"
              height={36}
              style={{ height: "36px", width: "auto" }}
            />
            <span style={{ color: "#1a1a1a18", fontSize: "18px" }}>×</span>
            {/* Roblox wordmark */}
            <RobloxWordmark height={26} />
          </div>
        </div>

        {/* Footer */}
        <footer
          className="px-8 py-4 md:px-12"
          style={{ borderTop: "1px solid #1a1a1a0d" }}
        >
          <p className="text-[11px]" style={{ color: "#1a1a1a38" }}>
            © 2026 Black Girls Code &middot; Powered by BCC Academy
          </p>
        </footer>
      </div>

      {/* ── Right: image panel (52%) ── */}
      <div
        className="hidden md:block md:sticky md:top-0 md:h-[100dvh] relative overflow-hidden"
        style={{ width: "52%", minWidth: "52%", maxWidth: "52%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/camp-roblox-photo.jpg"
          alt="A girl building pixel art on a laptop at a coding bootcamp"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>
    </div>
  );
}
