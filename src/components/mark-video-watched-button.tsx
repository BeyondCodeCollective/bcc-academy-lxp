"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { weekBtnQuiet } from "@/components/week-page-ui";
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
      <div className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-success-text">
        <CheckCircle size={16} />
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
      className={weekBtnQuiet}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      Mark as watched
    </button>
  );
}
