"use client";

import { useState, useTransition } from "react";
import { Check, Search } from "lucide-react";
import { setAttended } from "./actions";

export type CheckInRow = {
  id: string;
  name: string;
  parent: string;
  phone: string | null;
  allergies: string | null;
  checkedInAt: string | null;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white py-3 pl-10 pr-3.5 text-base text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none";

export function CheckInList({ initialRows }: { initialRows: CheckInRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const checkedIn = rows.filter((r) => r.checkedInAt).length;
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? rows.filter((r) => r.name.toLowerCase().includes(needle) || r.parent.toLowerCase().includes(needle))
    : rows;

  const toggle = (row: CheckInRow) => {
    const next = !row.checkedInAt;
    // Optimistic: flip now, roll back if the server says no.
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, checkedInAt: next ? new Date().toISOString() : null } : r)));
    setError(null);
    startTransition(async () => {
      const res = await setAttended(row.id, next);
      if (!res.ok) {
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, checkedInAt: row.checkedInAt } : r)));
        setError(res.error);
      } else {
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, checkedInAt: res.checkedInAt } : r)));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink">
          <span className="text-2xl font-bold tabular-nums">{checkedIn}</span>
          <span className="text-ink-soft"> of {rows.length} checked in</span>
        </p>
        {pending && <span className="text-xs text-ink-soft">Saving...</span>}
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search attendee or parent"
          aria-label="Search attendees"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No seated attendees yet.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No one matches &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-white">
          {visible.map((r) => {
            const on = !!r.checkedInAt;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  aria-pressed={on}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-paper-tint-soft"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? "border-primary bg-primary text-white" : "border-rule bg-white"
                    }`}
                  >
                    {on && <Check size={16} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-base font-semibold ${on ? "text-ink-soft" : "text-ink"}`}>{r.name}</span>
                    <span className="block truncate text-sm text-ink-soft">
                      {r.parent}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </span>
                    {r.allergies && <span className="block text-xs text-ink-soft">Allergies: {r.allergies}</span>}
                  </span>
                  {on && (
                    <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                      {new Date(r.checkedInAt as string).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
