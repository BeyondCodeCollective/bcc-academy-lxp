"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { heroReveal, fadeInUp, staggerContainerSlow } from "@/lib/marketing-motion";
import VideoBackground from "@/components/marketing/VideoBackground";
import { VIDEO_URLS } from "@/data/marketing/videos";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start center"],
  });
  const bgScale = useTransform(scrollYProgress, [0, 1], [0.6, 1]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 0.04]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <section id="waitlist" ref={sectionRef} className="relative py-20 md:py-40 lg:py-52 overflow-hidden bg-cobalt grain">
      {/* Cinematic background video */}
      <VideoBackground
        src={VIDEO_URLS.finalCTA}
        overlay="bg-cobalt/80 bg-gradient-to-br from-dark-cobalt/70 via-cobalt/60 to-electric-green/10"
      />

      {/* Decorative background — parallax scale */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ scale: bgScale, opacity: bgOpacity }}
      >
        <span className="font-display text-[30rem] md:text-[50rem] font-bold text-white uppercase leading-none">
          GO
        </span>
      </motion.div>

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainerSlow}
        >
          <motion.h2
            variants={heroReveal}
            className="font-display text-3xl sm:text-5xl md:text-7xl lg:text-[8rem] font-bold text-white leading-[0.9] uppercase"
          >
            Shape the systems already shaping your life.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-8 font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-electric-green uppercase leading-[0.95]"
          >
            Build your possible.
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-14 flex flex-wrap gap-4">
            <a
              href="#programs"
              className="group inline-flex items-center px-12 py-6 bg-electric-green text-true-black text-lg font-bold transition-all duration-300 hover:shadow-[0_8px_50px_rgba(229,247,1,0.4)] btn-press"
            >
              <span className="mr-3">Apply Now</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">&rarr;</span>
            </a>
          </motion.div>

          {/* Waitlist / email capture */}
          <motion.div variants={fadeInUp} className="mt-20 pt-10 border-t border-white/15 max-w-lg">
            <p className="text-sm text-white/60 mb-4">
              No cohort available in your area yet? Join the waitlist — we&rsquo;ll reach out when a program or hub opens near you.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                className="p-4 border-2 border-electric-green/30 bg-white/10"
              >
                <p className="text-base font-semibold text-electric-green">
                  You&rsquo;re in!
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Check your inbox for a welcome email.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="your@email.com"
                  required
                  className={`flex-1 px-5 py-3 text-base border-2 ${
                    error ? "border-orange" : "border-white/20"
                  } bg-white/10 text-white placeholder-white/40 focus:outline-none focus:border-electric-green focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(229,247,1,0.15)] transition-all duration-300`}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-white text-cobalt text-base font-bold transition-all duration-300 hover:shadow-[0_4px_15px_rgba(255,255,255,0.2)] whitespace-nowrap btn-press disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Join Waitlist"}
                </button>
              </form>
            )}
            {error && (
              <p className="mt-2 text-sm text-orange font-mono">{error}</p>
            )}
            <p className="mt-3 text-xs text-white/30 font-mono">
              No spam. Unsubscribe anytime.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
