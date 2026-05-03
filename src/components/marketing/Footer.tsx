import Link from "next/link";

const footerColumns = [
  {
    title: "Pathways",
    links: [
      { label: "Explorers", href: "/pathways/explorers" },
      { label: "Builders", href: "/pathways/builders" },
      { label: "Launchers", href: "/pathways/launchers" },
      { label: "Pivoters", href: "/pathways/pivoters" },
      { label: "Wisdom Leaders", href: "/pathways/wisdom-leaders" },
    ],
  },
  {
    title: "Programs",
    links: [
      { label: "The Forge ATL", href: "#hubs" },
      { label: "Catalyst", href: null },
      { label: "Black Girls Code", href: "https://wearebgc.org" },
      { label: "Summer Camps", href: null },
      { label: "How It Works", href: "#human-in-the-loop" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "About", href: null },
      { label: "Partner With Us", href: null },
      { label: "Become a Facilitator", href: null },
      { label: "Donate", href: null },
      { label: "Contact", href: null },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-charcoal border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link href="/">
              <span className="font-display text-3xl md:text-4xl font-bold text-white uppercase tracking-tight leading-none">
                BCC<br /><span className="text-electric-green">[</span>Academy<span className="text-electric-green">]</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
              Where everyone builds together. A community-based learning and
              workforce ecosystem for ages 7 to 87.
            </p>
            <p className="mt-6 text-xs text-white/40">
              Proudly home to{" "}
              <a
                href="https://wearebgc.org"
                className="text-electric-green hover:text-electric-green/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Black Girls Code
              </a>
            </p>
          </div>

          {/* Link Columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-[0.2em] mb-4 font-mono">
                [ {col.title} ]
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href === null ? (
                      <span
                        title="Coming soon"
                        className="text-sm text-white/30 cursor-default"
                      >
                        {link.label}
                      </span>
                    ) : link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/50 hover:text-electric-green transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-white/50 hover:text-electric-green transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40 font-mono">
            &copy; {new Date().getFullYear()} BCC Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span title="Coming soon" className="text-xs text-white/30 cursor-default">
              Privacy Policy
            </span>
            <span title="Coming soon" className="text-xs text-white/30 cursor-default">
              Terms of Service
            </span>
            <span title="Coming soon" className="text-xs text-white/30 cursor-default">
              Accessibility
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
