"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/types";

export function SessionToggles({
  sessions: initialSessions,
}: {
  sessions: Session[];
}) {
  const [sessions, setSessions] = useState(initialSessions);

  async function toggleSession(sessionId: string, completed: boolean) {
    const newStatus = completed ? "completed" : "upcoming";

    // Optimistic update
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("sessions")
      .update({ status: newStatus })
      .eq("id", sessionId);

    if (error) {
      // Revert on failure
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, status: completed ? "upcoming" : "completed" }
            : s
        )
      );
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      {sessions.map((session) => (
        <label
          key={session.id}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted-bg cursor-pointer"
        >
          <input
            type="checkbox"
            checked={session.status === "completed"}
            onChange={(e) => toggleSession(session.id, e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <div>
            <p
              className={`text-sm font-medium ${
                session.status === "completed"
                  ? "text-muted line-through"
                  : "text-foreground"
              }`}
            >
              Week {session.week_number}, Session {session.session_number} —{" "}
              {session.title}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}
