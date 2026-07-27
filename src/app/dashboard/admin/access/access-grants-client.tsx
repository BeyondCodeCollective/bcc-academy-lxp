"use client";

import { useState, useTransition } from "react";
import {
  grantProgramAccess,
  revokeProgramAccess,
  type AccessGrantRow,
} from "../actions-access";

export function AccessGrantsClient({
  initial,
  programs,
}: {
  initial: AccessGrantRow[];
  programs: { slug: string; name: string }[];
}) {
  const [rows, setRows] = useState(initial);
  const [email, setEmail] = useState("");
  const [programSlug, setProgramSlug] = useState(programs[0]?.slug ?? "");
  const [role, setRole] = useState<"admin" | "instructor">("admin");
  const [trackSlug, setTrackSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await grantProgramAccess({
        email,
        programSlug,
        role,
        trackSlug: trackSlug.trim() || null,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not add that grant.");
        return;
      }
      setError(null);
      setEmail("");
      setTrackSlug("");
      // The new row's id comes from the server; refetch by reloading the route
      // rather than faking one.
      window.location.reload();
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const res = await revokeProgramAccess(id);
      if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
      else setError(res.error ?? "Could not revoke that grant.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-faint">Person</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@wearebcc.org"
            className="w-60 border border-rule bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink-faint"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-faint">Program</span>
          <select
            value={programSlug}
            onChange={(e) => setProgramSlug(e.target.value)}
            className="border border-rule bg-white px-3 py-1.5 text-sm text-ink focus:border-ink-faint"
          >
            {programs.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-faint">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "instructor")}
            className="border border-rule bg-white px-3 py-1.5 text-sm text-ink focus:border-ink-faint"
          >
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-faint">
            Course (optional)
          </span>
          <input
            value={trackSlug}
            onChange={(e) => setTrackSlug(e.target.value)}
            placeholder="whole program"
            className="w-44 border border-rule bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink-faint"
          />
        </label>
        <button
          type="button"
          onClick={add}
          disabled={pending || !email.trim() || !programSlug}
          className="border border-rule bg-ink px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
        >
          Grant access
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-rule">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 font-semibold">Person</th>
              <th className="px-3 py-2 font-semibold">Program</th>
              <th className="px-3 py-2 font-semibold">Scope</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-rule/60 last:border-0">
                <td className="px-3 py-2 text-ink">
                  {r.name || r.email}
                  <span className="block text-xs text-ink-faint">{r.email}</span>
                </td>
                <td className="px-3 py-2 text-ink">{r.programSlug}</td>
                <td className="px-3 py-2 text-ink-soft">
                  {r.role} · {r.trackSlug ?? "whole program"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => revoke(r.id)}
                    disabled={pending}
                    className="text-sm font-medium text-ink-soft underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-ink-faint">
                  No cross-program grants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
