"use client";

type Props = {
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  sessionTitle: string;
  zoomUrl?: string;
};

export function ZoomEmbed({ sessionTitle, zoomUrl }: Props) {
  if (!zoomUrl) return null;

  return (
    <div className="mb-8">
      {/* Live indicator */}
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-red-600">
          Live Now
        </span>
        <span className="text-sm text-neutral-400">&middot; {sessionTitle}</span>
      </div>

      {/* Join card */}
      <div className="flex flex-col items-center justify-center gap-5 border-2 border-[#E54D2E]/20 bg-[#1a1a1a] px-6 py-12 text-center">
        <div className="space-y-1.5">
          <p className="text-xl font-bold text-white">{sessionTitle}</p>
          <p className="text-sm text-neutral-400">
            Your instructor is live right now. Click below to join!
          </p>
        </div>
        <a
          href={zoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#E54D2E] px-8 py-4 text-base font-bold text-white transition-colors hover:bg-[#F0613E] min-h-[56px]"
        >
          <span aria-hidden>🎥</span>
          Join Live Session
        </a>
        <p className="text-xs text-neutral-500">
          Opens Zoom in a new tab — make sure Zoom is installed on your device.
        </p>
      </div>
    </div>
  );
}
