"use client";

import { useState } from "react";
import { sendLoginLink } from "@/app/login/actions";

export function CampEmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

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
