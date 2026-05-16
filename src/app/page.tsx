import { redirect } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { LoginForm } from "@/components/login-form";
import { MarketingHome } from "@/components/marketing/MarketingHome";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
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
