"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { heroReveal, fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { Play, Pause } from "@phosphor-icons/react";
import { VIDEO_URLS } from "@/data/marketing/videos";

// Partners with local logo files render as images; others as styled wordmarks.
const partners: { name: string; logo?: string }[] = [
  { name: "CompTIA" },
  { name: "Salesforce" },
  { name: "Zapier",      logo: "/images/bcc/logos/zapier.svg" },
  { name: "IBM" },
  { name: "Spelman",     logo: "/images/bcc/logos/spelman.png" },
  { name: "Apple" },
  { name: "Figma" },
  { name: "ATDC",        logo: "/images/bcc/logos/atdc.webp" },
  { name: "MIT" },
  { name: "Serpentine",  logo: "/images/bcc/logos/serpentine.svg" },
  { name: "UC Berkeley" },
  { name: "ASU" },
];

const rotatingWords = ["BUILDS.", "GROWS.", "LEARNS.", "LEADS.", "BELONGS."];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.4, 0.85]);
  const contentY = useTransform(scrollYProgress, [0, 0.6], ["0%", "-12%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  return (
    <section ref={sectionRef} className="relative min-h-[100dvh] flex items-end overflow-hidden bg-true-black grain">
      {/* Mobile background — dot-grid pattern (hides video) */}
      <div className="absolute inset-0 md:hidden bg-true-black">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(229,247,1,0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Background video with parallax — hidden on mobile */}
      <motion.div className="absolute inset-0 max-md:hidden" style={{ y: videoY }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-[120%] object-cover"
        >
          <source
            src={VIDEO_URLS.hero}
            type="video/mp4"
          />
        </video>
      </motion.div>

      {/* Gradient overlay — deepens on scroll */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-true-black via-true-black/50 to-true-black/20"
        style={{ opacity: overlayOpacity }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-true-black via-transparent to-transparent" />

      {/* Video toggle — hidden on mobile (no video) */}
      <button
        onClick={toggleVideo}
        className="absolute top-36 md:top-28 right-6 z-20 w-11 h-11 bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors duration-300 max-md:hidden"
        aria-label={videoPlaying ? "Pause video" : "Play video"}
      >
        {videoPlaying ? <Pause size={16} weight="bold" /> : <Play size={16} weight="bold" />}
      </button>

      <motion.div
        className="relative z-10 w-full mx-auto max-w-7xl px-6 pb-16 md:pb-24 pt-16 md:pt-64"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-5xl"
        >
          <motion.p
            variants={fadeInUp}
            className="hidden md:block text-electric-green text-sm font-semibold tracking-[0.3em] uppercase mb-8 font-mono"
          >
            [ Beyond Code · For Everyone ]
          </motion.p>

          <motion.h1
            variants={heroReveal}
            className="font-display text-5xl sm:text-7xl md:text-[10rem] lg:text-[12rem] font-bold leading-[0.85] tracking-tight text-white uppercase"
          >
            Everyone
            <br />
            <AnimatePresence mode="wait">
              <motion.span
                key={rotatingWords[wordIndex]}
                initial={{ clipPath: "inset(100% 0 0 0)" }}
                animate={{ clipPath: "inset(0% 0 0 0)" }}
                exit={{ clipPath: "inset(0 0 100% 0)" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block text-electric-green"
              >
                {rotatingWords[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mt-10 text-lg md:text-xl text-white/70 leading-relaxed max-w-xl font-mono"
          >
            A community-based learning and workforce ecosystem giving people
            lifelong access to the skills, relationships, and pathways shaping
            the future of work.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-12 flex flex-col sm:flex-row items-start gap-4"
          >
            <a
              href="#programs"
              className="group inline-flex items-center px-10 py-5 bg-electric-green text-true-black text-base font-bold transition-all duration-300 hover:shadow-[0_8px_40px_rgba(229,247,1,0.35)] btn-press"
            >
              <span className="mr-3">Explore Programs</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </a>
            <a
              href="/quiz"
              className="inline-flex items-center px-10 py-5 border-2 border-white text-white text-base font-semibold transition-all duration-300 hover:bg-white hover:text-true-black btn-press"
            >
              Take the Career Quiz
            </a>
          </motion.div>
        </motion.div>

        {/* Trusted Partners — static grid */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mt-20 md:mt-28"
        >
          <p className="text-xs text-white/30 uppercase tracking-[0.3em] mb-6 text-center font-mono">
            [ Trusted Partners ]
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 md:gap-x-12">
            {partners.map((partner) =>
              partner.logo ? (
                // Local logo file — render as image
                <div key={partner.name} className="flex items-center justify-center h-7">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-full w-auto max-w-[100px] object-contain opacity-40"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
              ) : (
                // No local logo — render as clean wordmark text
                <span
                  key={partner.name}
                  className="text-white/35 font-display font-bold uppercase tracking-widest text-sm md:text-base leading-none whitespace-nowrap"
                >
                  {partner.name}
                </span>
              )
            )}
          </div>
        </motion.div>
      </motion.div>

    </section>
  );
}
