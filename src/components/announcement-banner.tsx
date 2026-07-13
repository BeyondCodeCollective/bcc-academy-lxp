type Announcement = {
  id: string;
  message: string;
  track_slug: string | null;
  created_at: string;
};

// One quiet line per announcement — a heads-up, not a card. The home leads
// with a single Up-next panel; giving announcements the same banner weight
// buried it (four stacked banners, 2026-07-12). Course slugs render as their
// display names via `trackNames`.
export function AnnouncementBanner({
  announcements,
  trackNames = {},
}: {
  announcements: Announcement[];
  trackNames?: Record<string, string>;
}) {
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {announcements.map((a) => (
        <p key={a.id} className="flex items-center gap-2 text-[13px] text-ink-soft">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span className="min-w-0">
            <span className="font-semibold text-ink">{a.message}</span>
            {" — "}
            {a.track_slug && `${trackNames[a.track_slug] ?? a.track_slug} · `}
            {new Date(a.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </p>
      ))}
    </div>
  );
}
