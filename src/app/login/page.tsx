import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CentralLoginForm } from "@/components/central-login-form";
import { SignIn } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

// Program subdomains already have their own login at /
const PROGRAM_HOSTS = new Set([
  "atg.bccacademy.io",
  "forge.bccacademy.io",
  "catalyst.bccacademy.io",
]);

export const dynamic = "force-dynamic";

export default async function CentralLoginPage() {
  const h = await headers();
  const host = (h.get("host") ?? "").replace(/:\d+$/, "");

  // Redirect only when genuinely on a program subdomain — never on localhost
  // or bccacademy.io itself. Checking the host directly avoids the
  // program-override cookie causing a false redirect in local dev.
  if (PROGRAM_HOSTS.has(host)) {
    redirect("/");
  }

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

            <CentralLoginForm />
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
      </div>
    </div>
  );
}
