import { redirect } from "next/navigation";

export default async function MassWeekRedirect({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  redirect(`/dashboard/track/mass/${week}`);
}
