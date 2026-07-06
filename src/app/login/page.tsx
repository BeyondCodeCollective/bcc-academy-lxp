import { CentralLoginForm } from "@/components/central-login-form";
import { InviteLinkNotice } from "@/components/invite-link-notice";
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
          <Link href="/" className="font-display text-2xl font-bold text-white uppercase tracking-tight leading-none">
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

            <InviteLinkNotice />

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
      <div className="hidden lg:block relative w-1/2 h-full border-l border-white/10 overflow-hidden">
        <Image
          src="/images/bcc/brand/quiz-hero-2.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

    </div>
  );
}
