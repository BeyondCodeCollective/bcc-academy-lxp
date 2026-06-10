"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  sessionTitle: string;
};

type EmbedStatus =
  | "idle"
  | "loading"
  | "joining"
  | "joined"
  | "ended"
  | "error";

/**
 * ZoomEmbed — renders the Zoom Meeting SDK Component View inline.
 *
 * The meeting ID and password are resolved server-side and passed as props.
 * The SDK signature is fetched from /api/zoom-signature (server-only, never
 * exposes the SDK Secret to the browser). Students join as role=0 (attendee).
 */
export function ZoomEmbed({
  meetingNumber,
  password,
  userName,
  userEmail,
  sessionTitle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<EmbedStatus>("idle");
  const [error, setError] = useState<string>("");

  async function joinMeeting() {
    if (!containerRef.current) return;
    setStatus("loading");

    try {
      // Dynamic import keeps the ~3MB SDK out of the initial bundle
      const ZoomMtgEmbedded = (await import("@zoom/meetingsdk/embedded"))
        .default;

      if (!clientRef.current) {
        clientRef.current = ZoomMtgEmbedded.createClient();
      }

      const client = clientRef.current;

      await client.init({
        zoomAppRoot: containerRef.current,
        language: "en-US",
        customize: {
          video: {
            isResizable: false,
            viewSizes: {
              default: { width: containerRef.current.clientWidth || 900, height: 520 },
            },
          },
          toolbar: {
            buttons: [
              {
                text: "Leave",
                className: "zoom-leave-btn",
                onClick: () => {
                  client.leaveMeeting().then(() => setStatus("ended"));
                },
              },
            ],
          },
        },
      });

      setStatus("joining");

      // Fetch short-lived signature from our server — SDK Secret stays server-side
      const sigRes = await fetch("/api/zoom-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNumber }),
      });

      if (!sigRes.ok) {
        const { error: sigErr } = await sigRes.json().catch(() => ({}));
        throw new Error(sigErr ?? "Could not connect to the session");
      }

      const { signature, sdkKey } = await sigRes.json();

      await client.join({
        signature,
        sdkKey,
        meetingNumber,
        password,
        userName,
        userEmail,
      });

      setStatus("joined");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(msg);
      setStatus("error");
    }
  }

  // Cleanup when component unmounts (e.g. student navigates away)
  useEffect(() => {
    return () => {
      clientRef.current?.leaveMeeting().catch(() => null);
    };
  }, []);

  return (
    <div className="mb-8">
      {/* Session label */}
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
          Live Now
        </span>
        <span className="text-xs text-neutral-400">&middot; {sessionTitle}</span>
      </div>

      {/* Zoom container — SDK renders inside this div */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-neutral-950"
        style={{ minHeight: status === "joined" ? 520 : 0 }}
      />

      {/* Pre-join / error states */}
      {status !== "joined" && (
        <div className="flex flex-col items-center justify-center gap-4 border border-rule bg-neutral-950 px-6 py-14 text-center">
          {status === "idle" && (
            <>
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">
                  {sessionTitle}
                </p>
                <p className="text-sm text-neutral-400">
                  Your instructor is live. Join when you&apos;re ready.
                </p>
              </div>
              <button
                onClick={joinMeeting}
                className="inline-flex items-center gap-2 bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 min-h-[44px]"
              >
                Join Live Session
              </button>
            </>
          )}

          {(status === "loading" || status === "joining") && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                {status === "loading" ? "Loading session…" : "Connecting…"}
              </div>
            </div>
          )}

          {status === "ended" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-300">
                You left the session.
              </p>
              <button
                onClick={joinMeeting}
                className="inline-flex items-center gap-2 border border-neutral-600 px-5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-400 hover:text-white min-h-[44px]"
              >
                Rejoin
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => { setStatus("idle"); setError(""); }}
                className="inline-flex items-center gap-2 border border-neutral-600 px-5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-400 hover:text-white min-h-[44px]"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
