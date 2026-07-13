"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

// Convert a VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = "unsupported" | "default" | "denied" | "subscribed" | "loading";

export function PushToggle() {
  const [state, setState] = useState<PushState>("loading");

  // Check current subscription status on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Register service worker on mount so ready resolves
    navigator.serviceWorker.register("/sw.js").then(() => {
      return navigator.serviceWorker.ready;
    }).then((reg) => {
      return reg.pushManager.getSubscription();
    }).then((sub) => {
      setState(sub ? "subscribed" : "default");
    }).catch(() => {
      setState("default");
    });
  }, []);

  const toggle = useCallback(async () => {
    if (state === "subscribed") {
      // Unsubscribe
      setState("loading");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setState("default");
      } catch {
        setState("subscribed"); // revert on error
      }
      return;
    }

    // Subscribe
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("[push] No VAPID public key configured");
        setState("default");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const { endpoint, keys } = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, keys }),
      });

      setState("subscribed");
    } catch (err) {
      console.error("[push] Subscribe failed:", err);
      setState("default");
    }
  }, [state]);

  if (state === "unsupported") return null;

  return (
    <button
      onClick={toggle}
      disabled={state === "loading" || state === "denied"}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50
        text-ink-soft hover:bg-paper-tint hover:text-ink"
      title={
        state === "denied"
          ? "Notifications blocked — enable in browser settings"
          : state === "subscribed"
            ? "Turn off push notifications"
            : "Turn on push notifications"
      }
    >
      {state === "loading" ? (
        <Loader2 size={16} className="animate-spin" />
      ) : state === "subscribed" ? (
        <Bell size={16} className="text-accent" />
      ) : (
        <BellOff size={16} />
      )}
      <span className="hidden sm:inline">
        {state === "denied"
          ? "Blocked"
          : state === "subscribed"
            ? "Notifications on"
            : "Notifications off"}
      </span>
    </button>
  );
}
