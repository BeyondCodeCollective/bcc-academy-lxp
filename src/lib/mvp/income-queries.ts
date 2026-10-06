import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { MVP_INCOME_FIELDS, type MvpIncomeResponse } from "./household-income";

// Caller supplies an authorized program and its already-filtered roster.
// Public/anonymous answers and responses stamped to other programs are excluded.
export async function loadMvpIncome(db: ReturnType<typeof createServiceClient>, programId: string, learnerIds: string[]): Promise<MvpIncomeResponse[]> {
  const rows: MvpIncomeResponse[] = [];
  for (let offset = 0; offset < learnerIds.length; offset += 100) {
    let cursor: string | null = null;
    while (true) {
      let query = db.from("survey_responses").select("id, student_id, survey_type, completed_at, responses")
        .eq("program_id", programId).in("survey_type", Object.keys(MVP_INCOME_FIELDS))
        .in("student_id", learnerIds.slice(offset, offset + 100)).order("id", { ascending: true }).limit(500);
      if (cursor !== null) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error) throw new Error("Unable to load complete household-income data.");
      if (!data?.length) break;
      for (const row of data) rows.push({ ...row, responses: row.responses ?? {} });
      const next: string = data[data.length - 1].id;
      if (cursor !== null && next <= cursor) throw new Error("Household-income pagination did not advance.");
      cursor = next;
    }
  }
  return rows;
}
