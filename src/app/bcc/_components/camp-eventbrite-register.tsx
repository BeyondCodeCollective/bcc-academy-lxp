"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// Inline Eventbrite registration for a BCC landing page (no overlay).
//
// onOrderComplete fires reliably for the inline embed too (verified in prod
// logs — earlier "inline doesn't fire" was wrong; the real bug was the claim
// failing). On completion we POST the order id to /api/eventbrite/claim, which
// retries the Eventbrite lookup for a few seconds (the order isn't queryable the
// instant checkout finishes) and returns the durable /invite/<token> URL — we
// redirect there, landing the registrant on the holding page. The order.placed
// webhook is the backstop that provisions + emails if the call never happens.

type EBWidgets = {
  createWidget: (opts: {
    widgetType: "checkout";
    eventId: string;
    iframeContainerId: string;
    onOrderComplete?: (event: { orderId?: string }) => void;
  }) => void;
};

export function CampEventbriteRegister({
  eventId,
  accent,
  height,
}: {
  eventId: string;
  accent: string;
  /** Inline embed height override (px). Defaults to 520. */
  height?: number | null;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "sent">("idle");
  const containerId = `eb-checkout-${eventId}`;
  const embedHeight = height && height > 0 ? height : 520;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const init = () => {
      if (cancelled) return;
      const eb = (window as unknown as { EBWidgets?: EBWidgets }).EBWidgets;
      if (eb) {
        eb.createWidget({
          widgetType: "checkout",
          eventId,
          iframeContainerId: containerId,
          onOrderComplete: (event) => {
            void handleOrderComplete(event?.orderId);
          },
        });
      } else if (attempts < 50) {
        attempts++;
        setTimeout(init, 100);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [eventId, containerId]);

  async function handleOrderComplete(orderId?: string) {
    setStatus("processing");
    if (!orderId) {
      setStatus("sent");
      return;
    }
    try {
      const res = await fetch("/api/eventbrite/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as { redirectUrl?: string };
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("sent");
    }
  }

  // While claim resolves the order (a few seconds) we replace the embed with a
  // clear "taking you in" state, then redirect.
  if (status === "processing") {
    return (
      <div
        className="border-l-4 p-4"
        style={{ borderColor: accent, background: `${accent}10` }}
      >
        <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
          You&apos;re in 🎉
        </p>
        <p className="mt-1 text-sm" style={{ color: "#1a1a1a80" }}>
          Taking you into your portal…
        </p>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="border-l-4 p-4" style={{ borderColor: accent, background: `${accent}10` }}>
        <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
          You&apos;re registered 🎉
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#1a1a1a80" }}>
          Check your email for your portal link — it&apos;s your door back in any time.
          Check spam if it doesn&apos;t arrive within a minute.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        id="eventbrite-widget-sdk"
        src="https://www.eventbrite.com/static/widgets/eb_widgets.js"
        strategy="lazyOnload"
      />
      <style>{`#${containerId}, #${containerId} iframe { width: 100%; min-height: ${embedHeight}px; border: 0; }`}</style>
      <div id={containerId} style={{ width: "100%" }} />
      <p className="mt-3 text-xs leading-relaxed" style={{ color: "#1a1a1a70" }}>
        We&apos;ll take you straight into your portal after you register. Your
        one-click access link is also emailed to you.
      </p>
    </>
  );
}
