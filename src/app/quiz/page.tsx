import { notFound } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import QuizClient from "./QuizClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Career Quiz — BCC Academy",
  description:
    "Discover your tech career path. A quick personality quiz to point you to a pathway that fits.",
};

export default async function QuizPage() {
  const program = await getProgram();
  // The quiz only lives on the apex marketing domain. On any program
  // subdomain (atg/forge/catalyst), this route 404s — students don't
  // land on a marketing quiz from inside their dashboard experience.
  if (program.slug !== "marketing") {
    notFound();
  }
  return (
    <div className="marketing-scope">
      <QuizClient />
    </div>
  );
}
