import { PublicApplyForm } from "./public-apply-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apply — She's Built for This | Black Girls Code",
  description:
    "Applications for She's Built for This, a Saturday leadership cohort in Oakland for girls in 6th through 8th grade.",
};

export default function SbftApplyPage() {
  return <PublicApplyForm />;
}
