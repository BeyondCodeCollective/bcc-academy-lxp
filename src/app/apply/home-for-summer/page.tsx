import { ClosedForm } from "./closed-form";

export const dynamic = "force-dynamic";

// Applications closed 2026-08-07 (cohort filled; program starts 8/10). The
// page now captures interest for future cohorts — see ClosedForm. To reopen
// applications, render PublicApplyForm from ./public-apply-form again.
export default function HomeForSummerApplyPage() {
  return <ClosedForm />;
}
