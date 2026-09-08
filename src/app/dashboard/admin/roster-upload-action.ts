"use server";

import { requireManager } from "./actions-shared";
import { parseRoster } from "@/lib/roster-import";

/** Read a roster attachment and hand back the addresses in it. Writes nothing:
 *  the emails land in the same box an admin would have pasted into, and the
 *  existing allowlist + invite path takes it from there unchanged. */
export async function parseRosterFileAction(
  formData: FormData,
): Promise<
  | {
      ok: true;
      emails: string[];
      /** Keyed by email so the caller can hand it straight to
       *  replaceAllowedEmails without re-deriving anything. */
      names: Record<string, { firstName: string; lastName: string }>;
      named: number;
      duplicates: number;
      rejected: number;
      fileName: string;
    }
  | { ok: false; error: string }
> {
  await requireManager();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file first." };
  }
  // A cohort roster is a few hundred rows; anything larger is the wrong file.
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "That file is over 5MB — is it the right one?" };
  }

  const res = await parseRoster(file.name, Buffer.from(await file.arrayBuffer()));
  if (!res.ok) return res;

  const names: Record<string, { firstName: string; lastName: string }> = {};
  for (const p of res.parse.people) {
    if (p.firstName || p.lastName) {
      names[p.email] = { firstName: p.firstName, lastName: p.lastName };
    }
  }

  return {
    ok: true,
    emails: res.parse.people.map((p) => p.email),
    names,
    named: Object.keys(names).length,
    duplicates: res.parse.duplicates.length,
    rejected: res.parse.rejected.length,
    fileName: file.name,
  };
}
