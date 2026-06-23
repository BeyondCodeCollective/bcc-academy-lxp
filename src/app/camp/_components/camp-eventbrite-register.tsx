"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// Embedded Eventbrite registration for a camp page. The widget hands us only an
// order id on completion; we POST it to /api/eventbrite/claim, which provisions
// the portal account and returns the durable /invite/<token> URL — we redirect
// there, landing the registrant on the holding page in the same session. If the
// claim hiccups, the order.placed webhook still provisions + emails them, so we
// show a reassuring "check your email" fallback rather than an error.

type EBWidgets = {
  createWidget: (opts: {
    widgetType: "checkout";
    eventId: string;
    modal: boolean;
    modalTriggerElementId: string;
    onOrderComplete?: (event: { orderId?: string }) => void;
  }) => void;
};

export function CampEventbriteRegister({
  eventId,
  accent,
  ctaLabel,
}: {
  eventId: string;
  accent: string;
  ctaLabel?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "sent">("idle");
  const triggerId = `eb-register-${eventId}`;

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
          modal: true,
          modalTriggerElementId: triggerId,
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
  }, [eventId, triggerId]);

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
      <button
        type="button"
        id={triggerId}
        disabled={status === "processing"}
        className="text-sm font-semibold transition-opacity"
        style={{
          width: "100%",
          padding: "13px 20px",
          background: accent,
          color: "#fff",
          border: "none",
          cursor: status === "processing" ? "wait" : "pointer",
          minHeight: "48px",
          letterSpacing: "0.01em",
          opacity: status === "processing" ? 0.7 : 1,
        }}
      >
        {status === "processing" ? "Setting up your spot…" : (ctaLabel || "Register now →")}
      </button>
    </>
  );
}
