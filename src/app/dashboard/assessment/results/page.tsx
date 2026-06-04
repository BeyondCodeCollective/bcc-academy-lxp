import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getAssessmentResult } from "../actions";
import { ResultsProfile } from "./results-profile";

export default async function ResultsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const result = await getAssessmentResult();
  if (!result) redirect("/dashboard/assessment");

  return (
    <div className="min-h-screen bg-paper">
      <ResultsProfile result={result.scored_output as import("@/lib/assessment/types").ScoredOutput} />
    </div>
  );
}
