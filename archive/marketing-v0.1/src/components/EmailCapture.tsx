"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/motion";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className="py-24 md:py-32 px-6 bg-electric-green relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 font-display text-[20rem] font-bold text-true-black/[0.04] uppercase select-none pointer-events-none leading-none translate-x-1/4 -translate-y-1/4">
        JOIN
      </div>

      <div className="mx-auto max-w-2xl relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="text-center"
        >
          <p className="text-true-black/60 text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Stay Connected ]
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-true-black uppercase">
            Not ready yet?
            <br />No pressure.
          </h2>
          <p className="mt-4 text-lg text-true-black/70 max-w-xl mx-auto">
            Get a weekly email with free resources, upcoming workshops, and
            career tips. No spam — just things that actually help.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-10 p-6 border-2 border-true-black/20 rounded-none bg-true-black"
            >
              <p className="text-lg font-semibold text-electric-green">You&rsquo;re in!</p>
              <p className="mt-1 text-sm text-white/70">
                Check your inbox for a welcome email.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-5 py-4 text-base border-2 border-true-black/20 rounded-none bg-white text-true-black placeholder-grey-3 focus:outline-none focus:border-true-black transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-true-black text-electric-green text-base font-bold rounded-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-true-black/40 font-mono">
            No spam. Unsubscribe anytime. We respect your inbox.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
