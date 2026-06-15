"use client";

import { useState, useEffect } from "react";
import { sendLoginLink } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";

export function CampEmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  // Shared-device guard: if someone is already signed in on this browser
  // (common at camps), surface it so a different family doesn't accidentally
  // sign up / land inside the previous person's account.
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSessionEmail(data.user?.email ?? null))
      .catch(() => setSessionEmail(null));
  }, []);

  async function handleSwitchAccount() {
    await createClient().auth.signOut();
    setSessionEmail(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");

    const result = await sendLoginLink({
      email: email.trim(),
      origin: window.location.origin,
      joinTrack: "roblox-virtual-bootcamp",
      next: "/dashboard/track/roblox-virtual-bootcamp/1",
    });

    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      const msg = result.error.includes("invite list")
        ? "We don't see your email yet. Make sure you've registered on the BGC event page — it can take up to 24 hours to process."
        : result.error;
      setError(msg);
    }
  }

  // Already signed in (often a shared device): skip the signup form entirely —
  // one clear action to continue, plus a way to switch accounts.
  if (sessionEmail) {
    return (
      <div className="border-l-4 p-4" style={{ borderColor: "#7C3AED", background: "#7C3AED10" }}>
        <p className="text-sm" style={{ color: "#1a1a1a" }}>
          Signed in as <strong>{sessionEmail}</strong>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <a
            href="/dashboard"
            className="text-sm font-semibold"
            style={{
              padding: "11px 20px",
              background: "#7C3AED",
              color: "#fff",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Go to your portal →
          </a>
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="text-xs font-medium underline"
            style={{ color: "#1a1a1a80", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Not you? Sign out &amp; use a different email
          </button>
        </div>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div>
        <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
          Check your inbox
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#1a1a1a80" }}>
          We sent a sign-in link to{" "}
          <span className="font-medium" style={{ color: "#1a1a1a" }}>{email}</span>.
          {" "}Check spam if it doesn't arrive within a minute.
        </p>
        <button
          onClick={() => { setStatus("idle"); setEmail(""); setError(""); }}
          className="mt-3 text-xs transition-colors"
          style={{ color: "#1a1a1a55", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
          className="text-sm transition-all"
          style={{
            flex: "1 1 200px",
            padding: "11px 14px",
            border: "1px solid #d4d4d4",
            background: "#fff",
            color: "#1a1a1a",
            outline: "none",
            minHeight: "44px",
            fontSize: "15px",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#7C3AED"; }}
          onBlur={(e) => { e.target.style.borderColor = "#d4d4d4"; }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="text-sm font-semibold transition-opacity"
          style={{
            padding: "11px 20px",
            background: "#7C3AED",
            color: "#fff",
            border: "none",
            cursor: status === "loading" ? "wait" : "pointer",
            minHeight: "44px",
            letterSpacing: "0.01em",
            opacity: status === "loading" ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {status === "loading" ? "Sending…" : "Get your link →"}
        </button>
      </div>
      {error && (
        <p className="mt-2.5 text-xs leading-relaxed" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </form>
  );
}
