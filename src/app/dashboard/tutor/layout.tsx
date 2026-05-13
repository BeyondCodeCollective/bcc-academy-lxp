import { notFound } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { isTutorAvailable } from "@/lib/programs";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const program = await getProgram();
  if (!isTutorAvailable(program)) notFound();
  return <>{children}</>;
}
