"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import type { Pathway } from "@/data/pathways";

interface PathwayCardProps {
  pathway: Pathway;
  index: number;
}

export default function PathwayCard({ pathway, index }: PathwayCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="flex-shrink-0 w-[280px] md:w-[320px] lg:w-full snap-start"
    >
      <Link
        href={`/pathways/${pathway.id}`}
        className="group block rounded-none border-2 border-true-black/10 hover:border-cobalt/40 transition-all duration-300 overflow-hidden hover:-translate-y-1"
      >
        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden">
          <Image
            src={pathway.image}
            alt={pathway.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 280px, (max-width: 1024px) 320px, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-true-black/30 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs text-cobalt font-bold uppercase tracking-[0.15em] font-mono mb-1">[ {pathway.stage} ]</p>
          <h3 className="text-lg font-display font-bold text-true-black uppercase">
            {pathway.name}
          </h3>
          <p className="mt-1 text-sm italic text-grey-3 line-clamp-1">
            &ldquo;{pathway.tagline}&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-cobalt group-hover:text-dark-cobalt transition-colors">
            Explore pathway
            <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
