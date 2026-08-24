"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { ArrowRight, Rocket } from "@phosphor-icons/react";
import Image from "next/image";

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = 60;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setCurrent(eased * value);
      if (step >= steps) {
        setCurrent(value);
        clearInterval(timer);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  const display = value >= 1000 ? Math.round(current).toLocaleString() : value < 10 ? current.toFixed(1) : Math.round(current).toString();

  return <span ref={ref}>{display}{suffix}</span>;
}

const successStories = [
  {
    name: "Terri W.",
    before: "Retail Manager",
    after: "Junior Data Analyst",
    pathway: "Pivoters",
    image: "/images/bcc/faces/face-03.jpg",
    salaryChange: "+62%",
  },
  {
    name: "Marcus J.",
    before: "Unemployed",
    after: "UX Designer at Deloitte",
    pathway: "Launchers",
    image: "/images/bcc/faces/face-05.jpg",
    salaryChange: "First tech role",
  },
  {
    name: "Diane L.",
    before: "Teacher (28 yrs)",
    after: "EdTech Product Lead",
    pathway: "Wisdom Leaders",
    image: "/images/bcc/faces/face-10.jpg",
    salaryChange: "+41%",
  },
];

export default function OutcomesSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-off-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-20"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Real Results ]
          </p>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-end">
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-true-black uppercase leading-[0.95]">
              What happens
              <br />after you
              <br /><span className="text-cobalt">finish</span>
            </h2>
            <div>
              <p className="text-lg text-grey-3 leading-relaxed max-w-lg">
                Our learners don&rsquo;t just complete courses — they land roles,
                change industries, and out-earn their previous careers. Here&rsquo;s
                the proof.
              </p>
              {/* Headline stats inline */}
              <div className="mt-8 flex items-center flex-wrap gap-6 md:gap-10">
                <div>
                  <p className="text-3xl md:text-5xl font-display font-bold text-cobalt">
                    <Counter value={87} suffix="%" />
                  </p>
                  <p className="text-sm text-grey-3 mt-1">employed in 6 months</p>
                </div>
                <div className="w-px h-12 bg-true-black/10 hidden sm:block" />
                <div>
                  <p className="text-3xl md:text-5xl font-display font-bold text-cobalt">
                    <Counter value={12000} suffix="+" />
                  </p>
                  <p className="text-sm text-grey-3 mt-1">career transitions</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Success stories — not stats boxes */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {successStories.map((story) => (
            <motion.div
              key={story.name}
              variants={fadeInUp}
              className="group relative rounded-none overflow-hidden border-2 border-true-black/5 hover:border-cobalt/30 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Photo */}
              <div className="h-72 relative overflow-hidden">
                <Image
                  src={story.image}
                  alt={story.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-true-black/70 via-true-black/20 to-transparent" />

                {/* Salary badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-electric-green text-true-black text-xs font-bold flex items-center gap-1">
                  <Rocket size={14} weight="bold" />
                  {story.salaryChange}
                </div>

                {/* Name overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-semibold text-lg">{story.name}</p>
                  <div className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white mt-1">
                    {story.pathway} Pathway
                  </div>
                </div>
              </div>

              {/* Transformation */}
              <div className="p-6 bg-white">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-grey-3 uppercase tracking-wider font-mono mb-1">Before</p>
                    <p className="text-sm font-semibold text-true-black">{story.before}</p>
                  </div>
                  <ArrowRight size={20} weight="bold" className="text-cobalt flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-cobalt uppercase tracking-wider font-mono mb-1">After</p>
                    <p className="text-sm font-semibold text-true-black">{story.after}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
