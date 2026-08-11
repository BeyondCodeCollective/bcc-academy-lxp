"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

export function TutorFab() {
  const pathname = usePathname();

  // Hide on the tutor page itself, and everywhere in the admin panel — the
  // tutor is a learner surface, and back there the bubble sits on top of the
  // staff "Preview as student" pill.
  if (pathname === "/dashboard/tutor" || pathname.startsWith("/dashboard/admin")) return null;

  return (
    <Link
      href="/dashboard/tutor"
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-sm shadow-neutral-900/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-neutral-900/30 active:scale-95"
      aria-label="Open AI Tutor"
    >
      <MessageCircle size={22} />
    </Link>
  );
}
