import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getProgram } from "@/lib/programs/server";
import { createClient } from "@/lib/supabase/server";
import { MarketingHome } from "@/components/marketing/MarketingHome";

export const dynamic = "force-dynamic";

const PROD_PROGRAM_HOSTS = new Set([
  "atg.bccacademy.io",
  "forge.bccacademy.io",
]);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const program = await getProgram();

  if (program.slug === "marketing") {
    return <MarketingHome />;
  }

  if (program.slug === "catalyst") {
    redirect("/survey/network-plus-post");
  }

  // Program subdomains (atg, forge) — no longer host their own login form.
  // Already-authenticated visitors continue to /dashboard; everyone else is
  // sent to the central login on the marketing domain (or, on Vercel
  // preview / local dev where there is no apex domain, the same-origin
  // /login route).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const sp = await searchParams;
  const forwarded = new URLSearchParams();
  for (const k of ["error", "track"] as const) {
    const v = sp[k];
    if (typeof v === "string") forwarded.set(k, v);
  }

  const h = await headers();
  const host = (h.get("host") ?? "").replace(/:\d+$/, "");
  const target = PROD_PROGRAM_HOSTS.has(host)
    ? "https://bccacademy.io/login"
    : "/login";
  const qs = forwarded.toString();
  redirect(qs ? `${target}?${qs}` : target);
}
