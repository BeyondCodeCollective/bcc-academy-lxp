"use client";

import { useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { fadeInUp } from "@/lib/motion";
import { MapPin, Globe, ArrowRight, VideoCamera, Monitor } from "@phosphor-icons/react";
import Image from "next/image";
import { events } from "@/data/events";

const formatIcons: Record<string, typeof MapPin> = {
  "In-Person": MapPin,
  Virtual: VideoCamera,
  Hybrid: Monitor,
};

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HubsAndEvents() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const futureEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.date + "T23:59:59") >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, []);

  return (
    <section ref={sectionRef} id="hubs" className="py-24 md:py-32 px-6 bg-cobalt relative overflow-hidden grain">
      {/* Decorative background text */}
      <div className="absolute bottom-0 right-0 font-display text-[15rem] md:text-[25rem] font-bold text-white/[0.03] uppercase select-none pointer-events-none leading-none translate-x-1/4 translate-y-1/4">
        FORGE
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Flagship hub — hero card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="grid lg:grid-cols-5 gap-0 border-2 border-electric-green/30 overflow-hidden mb-10"
        >
          <div className="lg:col-span-3 h-64 lg:h-auto min-h-[400px] relative overflow-hidden">
            <motion.div className="absolute inset-[-15%]" style={{ y: imageY }}>
              <Image
                src="/images/bcc/forge-panel.jpg"
                alt="Panel discussion at The Forge ATL"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-r from-cobalt/40 to-transparent" />
            <div className="absolute top-6 left-6">
              <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-electric-green text-true-black">
                Now Open
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 p-8 md:p-12 flex flex-col justify-center bg-white/10 backdrop-blur-sm">
            <p className="text-electric-green text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
              [ Our Flagship Hub ]
            </p>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase leading-[0.95]">
              The Forge
              <br />
              ATL
            </h2>
            <p className="mt-4 text-white/60 leading-relaxed">
              10,000 sq ft of learning space, maker labs, and community rooms in
              the heart of Atlanta. Or join virtually from anywhere.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <p className="text-sm text-white/50 font-mono flex items-center gap-1.5">
                <MapPin size={14} weight="bold" className="text-electric-green" />
                Atlanta, GA
              </p>
              <p className="text-sm text-white/50 font-mono flex items-center gap-1.5">
                <Globe size={14} weight="bold" className="text-electric-green" />
                Virtual worldwide
              </p>
            </div>
            <span
              title="Coming soon"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-electric-green/50 cursor-default self-start"
            >
              Visit The Forge
              <ArrowRight size={16} weight="bold" />
            </span>
          </div>
        </motion.div>

        {/* Events list */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold text-white uppercase">
              Upcoming Events
            </h3>
            <div className="flex items-center gap-4">
              <span
                title="Coming soon"
                className="inline-flex items-center gap-2 text-sm font-bold text-electric-green/50 cursor-default"
              >
                Free Workshops
                <ArrowRight size={14} weight="bold" />
              </span>
              <span className="text-white/20">|</span>
              <span
                title="Coming soon"
                className="inline-flex items-center gap-2 text-sm font-bold text-white/30 cursor-default"
              >
                All Events
                <ArrowRight size={14} weight="bold" />
              </span>
            </div>
          </div>

          {futureEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-3">
              {futureEvents.map((event) => {
                const FormatIcon = formatIcons[event.format] || Monitor;
                return (
                  <div
                    key={event.id}
                    className="group p-5 border-2 border-white/10 bg-white/5 hover:border-electric-green/30 transition-all duration-300 flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 text-center">
                      <p className="text-sm font-bold text-electric-green font-mono">
                        {formatEventDate(event.date)}
                      </p>
                      <p className="text-[10px] text-white/40 font-mono">
                        {event.time}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-white truncate">
                        {event.title}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-xs text-white/40">
                          <FormatIcon size={12} weight="bold" />
                          {event.format}
                        </span>
                        <span className="text-xs text-white/40">
                          w/{" "}
                          <span className="text-white/60 font-semibold">
                            {event.partner}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 border-2 border-white/10 bg-white/5 text-center">
              <p className="text-white/60 text-base">
                No upcoming events scheduled.
              </p>
              <p className="mt-2 text-sm text-white/40">
                Join our newsletter to be first to know when new events drop.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
