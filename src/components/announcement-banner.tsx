import { Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  message: string;
  track_slug: string | null;
  created_at: string;
};

export function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {announcements.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3"
        >
          <Megaphone size={16} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">{a.message}</p>
            <p className="mt-1 text-xs text-ink-faint">
              {a.track_slug && (
                <span className="mr-2 rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                  {a.track_slug}
                </span>
              )}
              {new Date(a.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
