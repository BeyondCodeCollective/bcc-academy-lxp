import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isExitConfidencePending } from "@/lib/assessment/exit-confidence";
import { ExitConfidence } from "./exit-confidence";

export default async function ExitConfidencePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!(await isExitConfidencePending(ctx.userId))) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-paper">
      <ExitConfidence />
    </div>
  );
}
