"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

const EMAIL_REGEX = /^[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+$/;

/**
 * Parse a CSV/paste blob into a normalised list of emails. Accepts:
 *  - One email per line.
 *  - Single-column CSV.
 *  - Multi-column CSV (Sprout Social, Mailchimp, etc) — picks the column
 *    matching an `email`-like header if present, otherwise scans each cell
 *    for the first valid email.
 *
 * Returns a deduped, lowercased list of valid email strings.
 */
export async function parseEmailList(raw: string): Promise<string[]> {
  if (!raw.trim()) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Detect a header row by looking at the first line's columns.
  const firstCols = splitCsvLine(lines[0]);
  const headerLower = firstCols.map((c) => c.toLowerCase().trim());
  const emailColIdx = headerLower.findIndex((c) =>
    /(^|\b)(e[\W_-]?mail|email[\W_-]?address|mail)\b/.test(c),
  );
  const hasHeader = emailColIdx >= 0;
  const rows = hasHeader ? lines.slice(1) : lines;

  const out = new Set<string>();
  for (const line of rows) {
    const cols = splitCsvLine(line);
    let candidate: string | null = null;
    if (hasHeader && cols[emailColIdx]) {
      candidate = cols[emailColIdx].trim();
    } else {
      candidate = cols.find((c) => EMAIL_REGEX.test(c.trim())) ?? null;
    }
    if (!candidate) continue;
    const normalised = candidate.replace(/^['"]|['"]$/g, "").trim().toLowerCase();
    if (EMAIL_REGEX.test(normalised)) out.add(normalised);
  }
  return [...out];
}

// Lightweight CSV line splitter — handles double-quoted cells with commas.
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.length === 1 ? line.split(/[,\t;]/) : cells;
}

export async function getAllowedEmails(
  programSlug: string,
): Promise<{ ok: boolean; emails: string[]; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    return { ok: false, emails: [], error: "Not authorized" };
  }
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("allowed_signup_emails")
    .select("email")
    .eq("program_slug", programSlug)
    .order("email");
  if (error) {
    console.error("[allowlist] getAllowedEmails failed", { programSlug, error });
    return { ok: false, emails: [], error: error.message };
  }
  return { ok: true, emails: (data ?? []).map((r) => r.email) };
}

/**
 * Replace the entire allowlist for a program with the given emails. Atomic
 * delete-then-insert: pasting an empty list clears the allowlist for that
 * program. Returns the count of accepted emails so the UI can confirm.
 */
export async function replaceAllowedEmails(
  programSlug: string,
  rawCsvOrList: string,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    return { ok: false, count: 0, error: "Not authorized" };
  }
  const emails = await parseEmailList(rawCsvOrList);
  const svc = createServiceClient();

  const { error: deleteErr } = await svc
    .from("allowed_signup_emails")
    .delete()
    .eq("program_slug", programSlug);
  if (deleteErr) {
    console.error("[allowlist] delete failed", { programSlug, error: deleteErr });
    return { ok: false, count: 0, error: deleteErr.message };
  }

  if (emails.length > 0) {
    const rows = emails.map((email) => ({
      email,
      program_slug: programSlug,
      added_by: ctx.userId ?? null,
    }));
    const { error: insertErr } = await svc
      .from("allowed_signup_emails")
      .insert(rows);
    if (insertErr) {
      console.error("[allowlist] insert failed", { programSlug, error: insertErr });
      return { ok: false, count: 0, error: insertErr.message };
    }
  }

  revalidatePath("/dashboard/admin/allowlist");
  return { ok: true, count: emails.length };
}
