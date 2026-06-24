"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// Eventbrite registration for a BCC landing page, MODAL mode.
//
// We use the modal (not inline) deliberately: the inline embed does NOT reliably
// fire onOrderComplete, and that callback is the ONLY client signal that lets us
// auto-redirect the registrant into the portal. The modal fires it reliably. On
// completion we POST the order id to /api/eventbrite/claim, which provisions the
// portal account and returns the durable /invite/<token> URL — we redirect there,
// landing them on the holding page in the same session. The order.placed webhook
// is the backstop (provisions + emails) if the browser never makes the call.

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
        onClick={() => {
          // Fallback if the SDK failed to load (ad-blocker / network): open the
          // event on Eventbrite directly so registration is never a dead button.
          const eb = (window as unknown as { EBWidgets?: EBWidgets }).EBWidgets;
          if (!eb) window.open(`https://www.eventbrite.com/e/${eventId}`, "_blank", "noopener,noreferrer");
        }}
        className="text-sm font-semibold transition-opacity"
        style={{
          width: "100%",
          padding: "14px 20px",
          background: accent,
          color: "#fff",
          border: "none",
          cursor: status === "processing" ? "wait" : "pointer",
          minHeight: "50px",
          letterSpacing: "0.01em",
          opacity: status === "processing" ? 0.7 : 1,
        }}
      >
        {status === "processing" ? "Setting up your spot…" : (ctaLabel || "Register now →")}
      </button>
      {/* What happens next, so it's never a mystery: we auto-redirect into the
         portal on completion, and the emailed access link is the backstop. */}
      <p className="mt-3 text-xs leading-relaxed" style={{ color: "#1a1a1a70" }}>
        We&apos;ll take you straight into your portal after you register. Your
        one-click access link is also emailed to you.
      </p>
    </>
  );
}
