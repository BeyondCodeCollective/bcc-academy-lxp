"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// Inline Eventbrite registration for a camp page. Renders Eventbrite's checkout
// form directly in the page (no modal overlay, no separate "register" button —
// the visitor fills the form once and submits it). On completion the widget
// hands us an order id; we POST it to /api/eventbrite/claim, which provisions the
// portal account and returns the durable /invite/<token> URL — we redirect there,
// landing the registrant on the holding page in the same session. If the claim
// hiccups, the order.placed webhook still provisions + emails them, so we show a
// reassuring "check your email" fallback rather than an error.

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
}: {
  eventId: string;
  accent: string;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "sent">("idle");
  const containerId = `eb-checkout-${eventId}`;

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
      // No id to resolve — the webhook backstop will still provision + email.
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
      // Couldn't provision in-session (e.g. event not mapped yet) — the webhook
      // covers it. Reassure rather than alarm; they ARE registered.
      setStatus("sent");
    } catch {
      setStatus("sent");
    }
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
      {/* Force the inline Eventbrite iframe tall enough that its form fits
         without an inner scrollbar. The iframe is cross-origin so we can't
         measure its content height — a generous fixed min-height is the lever
         we DO control (the iframe element's own size). */}
      <style>{`#${containerId}, #${containerId} iframe { width: 100%; min-height: 520px; border: 0; }`}</style>
      {status === "processing" && (
        <p className="mb-3 text-sm font-medium" style={{ color: accent }}>
          Setting up your spot…
        </p>
      )}
      <div id={containerId} style={{ width: "100%" }} />
    </>
  );
}
