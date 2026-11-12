"use client";

type Props = {
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  /** Shown next to LIVE NOW. Omit when the page already names the session
   *  right above the embed (single-session weeks). */
  sessionTitle?: string;
  /** Attendance context — joining records the learner present for this session. */
  trackSlug?: string;
  weekNumber?: number;
  sessionNumber?: number;
};

/**
 * Embeds the Zoom Meeting SDK Component View inside an <iframe>.
 *
 * The SDK requires React 18 and conflicts with the app's React 19 when
 * bundled together. Running it in an isolated iframe document avoids that
 * conflict entirely — the SDK has its own React 18 vendor copy in /public/zoom/.
 *
 * All SDK assets (WASM, workers, vendor JS) are self-hosted under /public/zoom/
 * so there is no runtime dependency on source.zoom.us CDN.
 */
export function ZoomEmbed({
  meetingNumber,
  password,
  userName,
  userEmail,
  sessionTitle,
  trackSlug,
  weekNumber,
  sessionNumber,
}: Props) {
  const params = new URLSearchParams({
    mn: meetingNumber,
    pwd: password,
    un: userName,
    ue: userEmail,
  });
  // Attendance context flows to the frame → signature request, which records
  // the learner present when they join.
  if (trackSlug) params.set("ts", trackSlug);
  if (weekNumber) params.set("wk", String(weekNumber));
  if (sessionNumber) params.set("sn", String(sessionNumber));
  const src = `/api/zoom-frame?${params.toString()}`;

  return (
    <div>
      {/* Zoom embed — isolated iframe. The page names the live state (the
         session picker and the block heading), so the frame carries no label. */}
      <div className="relative w-full overflow-hidden rounded-lg bg-ink aspect-video min-h-[220px] sm:min-h-[380px]">
        <iframe
          src={src}
          title={sessionTitle ? `Live session: ${sessionTitle}` : "Live session"}
          className="absolute inset-0 w-full h-full border-0"
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          allowFullScreen
        />
      </div>

    </div>
  );
}
