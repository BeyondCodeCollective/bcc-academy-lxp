"use client";

import { useState } from "react";
import { CheckCircle, Eye, Loader2 } from "lucide-react";
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
        <CheckCircle size={14} />
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
      className="inline-flex items-center gap-1.5 border border-rule bg-white px-3 py-2 text-xs font-medium text-ink-soft hover:border-ink-faint hover:bg-paper-tint-soft disabled:opacity-50 transition-colors min-h-[36px]"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
      Mark as watched
    </button>
  );
}
