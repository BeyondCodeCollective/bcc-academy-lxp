"use server";

import { requireAdmin } from "../actions-shared";
import { allowedProgramIds } from "@/lib/auth/program-access";

export async function loadCommitmentOptions() {
  const actor = await requireAdmin();
  if (!["admin", "super_admin"].includes(actor.role)) throw new Error("Not authorized");
  const ids = allowedProgramIds(actor.programId, actor.grants);
  const programs: { id: string; name: string }[] = [];
  const owners: { id: string; name: string }[] = [];
  if (actor.role === "super_admin" || ids.length) {
    let cursor: string | null = null;
    while (true) {
      let query = actor.svc.from("programs").select("id, name").order("id").limit(500);
      if (actor.role !== "super_admin") query = query.in("id", ids);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error || !data) throw new Error("Options unavailable");
      if (!data.length) break;
      programs.push(...data.map(row => ({ id: row.id, name: row.name || "Unnamed program" })));
      const next: string = data[data.length - 1].id;
      if (!next || (cursor && next <= cursor)) throw new Error("Options unavailable");
      cursor = next;
    }
  }
  let cursor: string | null = null;
  while (true) {
    let query = actor.svc.from("students").select("id, first_name, last_name, role")
      .in("role", ["admin", "super_admin"]).order("id").limit(500);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error || !data) throw new Error("Options unavailable");
    if (!data.length) break;
    owners.push(...data.map(row => ({ id: row.id,
      name: `${[row.first_name, row.last_name].filter(Boolean).join(" ") || "Unnamed staff member"} (${row.role})`,
    })));
    const next: string = data[data.length - 1].id;
    if (!next || (cursor && next <= cursor)) throw new Error("Options unavailable");
    cursor = next;
  }
  return { programs: programs.sort((a, b) => a.name.localeCompare(b.name)), owners: owners.sort((a, b) => a.name.localeCompare(b.name)) };
}
