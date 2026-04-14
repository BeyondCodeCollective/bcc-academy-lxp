import { redirect } from "next/navigation";

export default async function TechPlusWeekRedirect({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  redirect(`/dashboard/track/techplus/${week}`);
}
