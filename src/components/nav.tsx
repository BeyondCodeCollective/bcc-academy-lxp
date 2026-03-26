"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Books,
  ShieldCheck,
  ChatsCircle,
  SignOut,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/resources", label: "Resources", icon: Books },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: ChatsCircle },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="bg-neutral-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-2 sm:py-3">
        <Link href="/dashboard" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/atg-logo.svg"
            alt="After The Game"
            className="h-3.5 sm:h-4"
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-neutral-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={20} weight="bold" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith("/dashboard/admin")
                  ? "bg-white/15 text-white"
                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ShieldCheck size={20} weight="bold" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          <button
            onClick={async () => {
              document.cookie = "atg-demo-user=; path=/; max-age=0";
              const { createClient } = await import("@/lib/supabase/client");
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Sign out"
          >
            <SignOut size={20} weight="bold" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
