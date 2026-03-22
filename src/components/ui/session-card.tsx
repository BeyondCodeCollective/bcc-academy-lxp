import { Video } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { Session } from "@/lib/types";

export function SessionCard({
  session,
  showJoinButton = false,
}: {
  session: Session;
  showJoinButton?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">{session.title}</p>
          {session.description && (
            <p className="mt-0.5 text-sm text-muted">{session.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-sm text-muted">
            {session.session_date && (
              <span>{formatDate(session.session_date)}</span>
            )}
            {session.start_time && <span>{formatTime(session.start_time)}</span>}
            <span>Session {session.session_number}</span>
          </div>
        </div>
        {showJoinButton && session.meeting_link && (
          <a
            href={session.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Video size={16} />
            Join Session
          </a>
        )}
      </div>
    </div>
  );
}
