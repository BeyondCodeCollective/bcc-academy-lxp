"use client";

import { useState } from "react";
import { UserCheck, CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  weekNumber: number;
  initialCheckedIn: boolean;
};

export function MassCheckInButton({ weekNumber, initialCheckedIn }: Props) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    if (checkedIn || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: "mass",
          week_number: weekNumber,
          session_number: 1,
        }),
      });
      if (res.ok) {
        setCheckedIn(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkedIn) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold px-3.5 py-2.5 min-h-[44px] border border-green-100">
        <CheckCircle2 size={14} />
        Checked In
      </span>
    );
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={loading}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors disabled:opacity-50 w-full sm:w-auto"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <UserCheck size={14} />
      )}
      {loading ? "Checking in..." : "Check In"}
    </button>
  );
}
