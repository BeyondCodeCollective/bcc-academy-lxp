"use client";

import { useState } from "react";
import { markVideoWatched } from "@/app/dashboard/track/actions";

export function MarkVideoWatchedButton({
  trackSlug,
  weekNumber,
  initialWatched,
}: {
  trackSlug: string;
  weekNumber: number;
  initialWatched: boolean;
}) {
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  if (watched) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
        <span aria-hidden>✓</span>
        Marked as watched
      </div>
    );
  }

  async function handle() {
    setLoading(true);
    try {
      await markVideoWatched(trackSlug, weekNumber);
      setWatched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 transition-colors min-h-[36px]"
    >
      {loading ? <span aria-hidden className="animate-spin inline-block">◌</span> : <span aria-hidden>👁</span>}
      Mark as watched
    </button>
  );
}
