import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageRoles } from "@/lib/roles";
import { listAccessGrants, listGrantablePrograms } from "../actions-access";
import { AccessGrantsClient } from "./access-grants-client";

export const dynamic = "force-dynamic";

export default async function ProgramAccessPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  // Handing someone a program is a credential change — master only, same as
  // assigning roles.
  if (!canManageRoles(ctx.student?.email)) redirect("/dashboard");

  const [grants, programs] = await Promise.all([
    listAccessGrants(),
    listGrantablePrograms(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">
          Access
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Program access
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink-soft">
          Give someone a second program without making them a super-admin. Leave
          the course blank for the whole program, or name one course to confine
          them to it. Their own program stays as it is — this only adds.
        </p>
      </header>
      <AccessGrantsClient initial={grants} programs={programs} />
    </div>
  );
}
