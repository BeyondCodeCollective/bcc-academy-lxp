import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getProgram } from "@/lib/programs/server";
import { LoginForm } from "@/components/login-form";
import { MarketingHome } from "@/components/marketing/MarketingHome";

const MARKETING_HOSTS = new Set([
  "bccacademy.io",
  "www.bccacademy.io",
]);

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const h = await headers();
  const host = (h.get("host") ?? "").replace(/:\d+$/, "");
  if (MARKETING_HOSTS.has(host)) {
    return <MarketingHome />;
  }

  const program = await getProgram();

  if (program.slug === "marketing") {
    return <MarketingHome />;
  }

  return (
    <LoginForm
      logo={program.logo}
      programName={program.name}
      tagline={program.tagline}
      taglineColor={program.colors.tagline}
      organization={program.organization}
    />
  );
}
