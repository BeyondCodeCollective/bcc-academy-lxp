"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Facilitator } from "@/data/facilitators";

interface FacilitatorCardProps {
  facilitator: Facilitator;
  index: number;
}

export default function FacilitatorCard({
  facilitator,
  index,
}: FacilitatorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-none aspect-[3/4] cursor-pointer"
    >
      {/* Full portrait image */}
      <Image
        src={facilitator.image}
        alt={`${facilitator.name}, ${facilitator.title} at ${facilitator.org}`}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

      {/* Content pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <div className="text-xs font-bold text-teal uppercase tracking-wider mb-1.5">
          {facilitator.org}
        </div>
        <h3 className="text-lg md:text-xl font-display font-bold text-white leading-tight">
          {facilitator.name}
        </h3>
        <p className="mt-1 text-sm text-white/60">{facilitator.teaches}</p>
        <div className="mt-3 inline-flex items-center px-2.5 py-1 text-xs font-medium bg-white/10 text-white/70 backdrop-blur-sm">
          {facilitator.pathway}
        </div>
      </div>
    </motion.div>
  );
}
