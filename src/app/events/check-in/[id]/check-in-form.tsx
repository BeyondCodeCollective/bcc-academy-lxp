"use client";

import { useState, useTransition } from "react";
import { findSeats, selfCheckIn, type CheckInPerson } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white px-3.5 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none";
const BUTTON_CLASS =
  "w-full rounded-lg bg-ink px-4 py-3 text-base font-semibold text-white disabled:opacity-50";

export function CheckInForm({ eventId, keyParam }: { eventId: string; keyParam: string }) {
  const [email, setEmail] = useState("");
  const [people, setPeople] = useState<CheckInPerson[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await findSeats(eventId, keyParam, email);
      if (!r.ok) return setError(r.error);
      setPeople(r.people);
      setPicked(new Set(r.people.filter((p) => !p.checkedIn).map((p) => p.id)));
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const r = await selfCheckIn(eventId, keyParam, email, [...picked]);
      if (!r.ok) return setError(r.error);
      setDone(r.count);
    });
  }

  if (done !== null) {
    return (
      <div role="status">
        <h2 className="text-xl font-bold text-ink">{done > 0 ? "You're checked in" : "Already checked in"}</h2>
        <p className="mt-2 text-sm text-ink-soft">Find a seat. The team will start shortly.</p>
      </div>
    );
  }

  if (!people) {
    return (
      <form onSubmit={lookup} className="space-y-3">
        <label htmlFor="ci-email" className="block text-sm font-medium text-ink">
          Email you registered with
        </label>
        <input
          id="ci-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending} className={BUTTON_CLASS}>
          {pending ? "Looking up…" : "Find my seat"}
        </button>
      </form>
    );
  }

  const open = people.filter((p) => !p.checkedIn);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Who is here?</p>
      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.id}>
            <label className="flex items-center gap-3 rounded-lg border border-rule bg-white px-3.5 py-3 text-base text-ink">
              <input
                type="checkbox"
                className="h-5 w-5"
                disabled={p.checkedIn}
                checked={p.checkedIn || picked.has(p.id)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(p.id);
                  else next.delete(p.id);
                  setPicked(next);
                }}
              />
              <span>{p.label}</span>
              {p.checkedIn && <span className="ml-auto text-xs text-ink-soft">Checked in</span>}
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {open.length > 0 ? (
        <button type="button" onClick={confirm} disabled={pending || picked.size === 0} className={BUTTON_CLASS}>
          {pending ? "Checking in…" : "I'm here"}
        </button>
      ) : (
        <p className="text-sm text-ink-soft">Everyone on this registration is already checked in.</p>
      )}
    </div>
  );
}
