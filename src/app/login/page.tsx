import { CentralLoginForm } from "@/components/central-login-form";
import { SignIn } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getJoinablePrograms } from "@/lib/programs";

// Apex login page. Fully static — render input is just the in-memory
// program list. Legacy program subdomains (catalyst/atg/forge/forte
// .bccacademy.io) are redirected to "/" by proxy.ts before this page
// ever runs, so no headers() check is needed here.

export default function CentralLoginPage() {
  return (
    <div className="h-[100dvh] flex">
      {/* Left panel */}
      <div className="w-full lg:w-1/2 h-full bg-black flex flex-col">
        <header className="flex items-center px-8 md:px-12 py-6 md:py-8">
          <Link href="/" className="font-display text-white text-sm md:text-base font-bold uppercase tracking-tight">
            BCC <span className="text-electric-green">[</span>Academy<span className="text-electric-green">]</span>
          </Link>
        </header>

        <div className="flex-1 flex items-center px-8 md:px-12 lg:px-16 pb-6">
          <div className="w-full max-w-xl">
            <div className="text-white mb-4 md:mb-6">
              <SignIn size={48} weight="bold" />
            </div>
            <p className="text-electric-green text-xs font-mono uppercase tracking-[0.3em] mb-3">
              [ Student Portal ]
            </p>

            <CentralLoginForm
              programs={getJoinablePrograms()
                .filter((p) => p.tracks.length > 0)
                .map((p) => ({
                  slug: p.slug,
                  name: p.name,
                  // Invite-only programs (Forte) dead-end on bare /join/<slug>,
                  // so route the CTA straight to /join/<slug>?track=<first track>.
                  // Programs without an invite gate (Catalyst) keep the bare URL.
                  defaultTrack:
                    p.requireInviteLink === true && p.tracks[0]
                      ? p.tracks[0].slug
                      : null,
                }))}
            />
          </div>
        </div>
      </div>

      {/* Right panel — brand photo */}
      {/* TODO: Replace with new brand photo (current image has ex-employee) */}
      <div className="hidden lg:block relative w-1/2 h-full border-l border-white/10 overflow-hidden bg-gradient-to-br from-electric-green/10 to-transparent" />

    </div>
  );
}
