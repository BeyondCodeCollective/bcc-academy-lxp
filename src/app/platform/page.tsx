import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Platform — BCC Academy",
  robots: { index: false, follow: false },
};

// Internal hub for the three presentation pages. Same staff-only, standalone
// pattern as its siblings — one place to start a walkthrough from.

const PAGES = [
  {
    name: "The feature set",
    href: "/platform-features",
    blurb: "Everything the platform does, by capability.",
  },
  {
    name: "The platform map",
    href: "/platform-map",
    blurb: "Every page in production — each row opens the live product.",
  },
  {
    name: "The strategy brief",
    href: "/platform-brief",
    blurb: "Why we own the platform, and how YouTube fits inside it.",
  },
];

export default async function PlatformHubPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-7 pb-24 pt-16">
        <header>
          <p
            className="text-xs uppercase tracking-[0.18em] text-primary"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            BCC Academy · The Platform
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Start here.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Three views of the same platform: what it does, where it lives, and
            why we own it.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-4">
          {PAGES.map((page) => (
            <a
              key={page.href}
              href={page.href}
              className="panel group flex items-baseline justify-between gap-4 p-6 transition-colors hover:bg-paper-tint-soft"
            >
              <span>
                <span className="block text-xl font-bold tracking-tight text-ink">
                  {page.name}
                </span>
                <span className="mt-1 block text-sm text-ink-soft">
                  {page.blurb}
                </span>
              </span>
              <span
                className="whitespace-nowrap text-xs text-ink-faint group-hover:text-primary"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {page.href} ↗
              </span>
            </a>
          ))}
        </div>

        <footer
          className="mt-14 text-xs uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <span>bccacademy.io/platform · internal — staff only</span>
        </footer>
      </div>
    </div>
  );
}
