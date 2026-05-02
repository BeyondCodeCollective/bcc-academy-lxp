"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { events } from "@/data/marketing/events";
import { MapPin, VideoCamera, Monitor, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";

const eventImages = [
  "/images/bcc/initiatives/forge.jpg",
  "/images/bcc/community/community-07.jpg",
  "/images/bcc/community/community-02.jpg",
  "/images/bcc/community/community-05.jpg",
  "/images/bcc/initiatives/catalysts.jpg",
  "/images/bcc/community/community-06.jpg",
];

const formatIcons: Record<string, typeof MapPin> = {
  "In-Person": MapPin,
  Virtual: VideoCamera,
  Hybrid: Monitor,
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EventsSection() {
  return (
    <section id="events" className="py-16 md:py-28 lg:py-36 px-6 bg-grey-1">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Live Calendar ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase">
            What&rsquo;s Happening
          </h2>
          <p className="mt-6 text-lg text-grey-3 max-w-2xl mx-auto leading-relaxed">
            Real events, real people, real learning. Join us at The Forge ATL
            or from anywhere in the world.
          </p>
        </motion.div>

        {/* Event cards grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {events.map((event, idx) => {
            const FormatIcon = formatIcons[event.format] || Monitor;
            return (
              <motion.div
                key={event.id}
                variants={fadeInUp}
                className="group border-2 border-true-black/5 hover:border-cobalt/30 transition-all duration-300 bg-white"
              >
                {/* Event image */}
                <div className="h-44 relative overflow-hidden bg-grey-1">
                  <Image
                    src={eventImages[idx % eventImages.length]}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-true-black/20 to-transparent" />
                  {/* Format badge */}
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-true-black">
                      <FormatIcon size={10} weight="bold" />
                      {event.format}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <time className="text-sm font-bold text-cobalt font-mono">
                      {formatDate(event.date)}
                    </time>
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-electric-green/20 text-true-black">
                      {event.pathway}
                    </span>
                  </div>

                  <h3 className="text-lg font-display font-bold text-true-black uppercase leading-tight">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-grey-3 font-mono">
                    {event.time}
                  </p>

                  <p className="mt-3 text-sm text-grey-3 leading-relaxed line-clamp-2">
                    {event.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-true-black/5 flex items-center justify-between">
                    <span className="text-xs text-grey-3">
                      w/{" "}
                      <span className="text-true-black font-semibold">
                        {event.partner}
                      </span>
                    </span>
                    {event.location && (
                      <span className="text-xs text-grey-3 font-mono flex items-center gap-1">
                        <MapPin size={10} weight="bold" />
                        {event.location.split(",")[0]}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View all */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <span
            title="Coming soon"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-cobalt/30 text-cobalt/50 text-sm font-bold cursor-default"
          >
            All Events
            <ArrowRight size={16} weight="bold" />
          </span>
        </motion.div>
      </div>
    </section>
  );
}
