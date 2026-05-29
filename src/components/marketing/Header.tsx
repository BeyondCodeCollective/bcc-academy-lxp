"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X, Lightning } from "@phosphor-icons/react";
import Link from "next/link";

const navLinks = [
  { label: "Programs", href: "#programs" },
  { label: "Beyond Code Centers", href: "#hubs" },
  { label: "Sessions", href: "#sessions" },
  { label: "Events", href: "#events" },
];

interface HeaderProps {
  // When true, header starts with the solid black background instead of
  // fading in on scroll. Use on pages that don't have a dark hero section
  // immediately below the header (e.g. /events on the off-white bg).
  solid?: boolean;
}

export default function Header({ solid = false }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  const showSolid = solid || scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        showSolid
          ? "bg-true-black border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      {/* Announcement Banner */}
      {!bannerDismissed && (
        <div className="bg-electric-green text-true-black text-center text-sm py-3 px-4 md:px-10 relative font-mono">
          <a href="#hubs" className="hover:underline font-semibold">
            <Lightning size={14} weight="fill" className="inline mr-1 mb-0.5" />
            Beyond Code Centers ATL is open — a third space for technology, neither school nor work
            <span className="ml-2">&rarr;</span>
          </a>
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-true-black/40 hover:text-true-black transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center group">
          <span className="font-display text-2xl md:text-3xl font-bold text-white uppercase tracking-tight leading-none">
            BCC <span className="text-electric-green">[</span>Academy<span className="text-electric-green">]</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white hover:text-electric-green transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-300"
          >
            Sign In
          </a>
          <a
            href="/quiz"
            className="inline-flex items-center px-5 py-2.5 bg-electric-green text-true-black text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(229,247,1,0.3)] btn-press"
          >
            Take the Quiz
          </a>
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-3 text-white"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-true-black/95 backdrop-blur-lg border-t border-white/10 overflow-hidden"
            aria-label="Mobile navigation"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg text-white/70 hover:text-white transition-colors py-2"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-base text-white/50 hover:text-white transition-colors py-2"
              >
                Sign In
              </a>
              <a
                href="/quiz"
                onClick={() => setMobileOpen(false)}
                className="mt-4 inline-flex items-center justify-center px-5 py-3 bg-electric-green text-true-black font-bold"
              >
                Take the Quiz
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
