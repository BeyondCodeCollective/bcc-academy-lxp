"use client";

import { useEffect, useRef, useState } from "react";

export function ReadPageAloud({ title, description, objectives }: {
  title: string;
  description: string;
  objectives: string[];
}) {
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = typeof window !== "undefined" ? window.speechSynthesis : null;
    return () => { synthRef.current?.cancel(); };
  }, []);

  if (typeof window !== "undefined" && !("speechSynthesis" in window)) return null;

  function handleClick() {
    const synth = synthRef.current;
    if (!synth) return;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const text = [
      title,
      description,
      objectives.length ? `What you'll cover. ${objectives.join(". ")}` : "",
    ].filter(Boolean).join(". ");

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? "Stop reading" : "Read page aloud"}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
        speaking
          ? "bg-accent text-white"
          : "border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>
      {speaking ? "Stop" : "Read aloud"}
    </button>
  );
}
