import { getProgram } from "@/lib/programs/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const program = await getProgram();

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
