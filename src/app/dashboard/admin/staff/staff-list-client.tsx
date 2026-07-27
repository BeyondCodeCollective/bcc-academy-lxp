"use client";

import { useState, useTransition } from "react";
import { addStaffEmail, removeStaffEmail, type StaffEmailRow } from "../actions-staff";

// Manage the staff allowlist. @wearebgc.org is staff automatically (not shown
// here); this list is for staff on mixed domains (e.g. @wearebcc.org) that the
// domain rule can't decide, since real students also use @wearebcc.org.
export function StaffListClient({ initial }: { initial: StaffEmailRow[] }) {
  const [rows, setRows] = useState<StaffEmailRow[]>(initial);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    const value = email.trim().toLowerCase();
    if (!value) return;
    startTransition(async () => {
      const res = await addStaffEmail(value);
      if (!res.ok) {
        setError(res.error ?? "Could not add that email.");
        return;
      }
      setRows((prev) =>
        prev.some((r) => r.email === value)
          ? prev
          : [{ email: value, created_at: new Date(0).toISOString() }, ...prev],
      );
      setEmail("");
    });
  }

  function remove(target: string) {
    startTransition(async () => {
      const res = await removeStaffEmail(target);
      if (res.ok) setRows((prev) => prev.filter((r) => r.email !== target));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="name@wearebcc.org"
          className="w-72 border border-rule bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink-faint"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !email.trim()}
          className="border border-rule bg-ink px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
        >
          Add staff
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-rule">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 font-semibold">Staff email</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-b border-rule/60 last:border-0">
                <td className="px-3 py-2 text-ink">{r.email}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(r.email)}
                    disabled={pending}
                    className="text-sm font-medium text-ink-soft underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-ink-faint">
                  No staff added yet. @wearebgc.org accounts are staff automatically.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
