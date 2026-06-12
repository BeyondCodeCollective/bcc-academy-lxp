"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { TextScaleToggle } from "@/components/text-scale-toggle";

export function useReadAloud() {
  const [enabled, setEnabled] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = typeof window !== "undefined" ? window.speechSynthesis : null;
    return () => { synthRef.current?.cancel(); };
  }, []);

  function speak(text: string) {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    synthRef.current.speak(utter);
  }

  function stop() {
    synthRef.current?.cancel();
  }

  return { enabled, setEnabled, speak, stop };
}

export function AssessmentA11yBar({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <div className="flex items-center justify-end gap-3 pb-4 border-b border-ink/10 mb-6">
      <TextScaleToggle compact tone="light" />
      {supported && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn off read aloud" : "Turn on read aloud"}
          title={enabled ? "Read aloud: on" : "Read aloud: off"}
          className={`
            inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors
            ${enabled
              ? "bg-accent text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }
          `}
        >
          {enabled ? (
            <SpeakerHigh size={14} weight="bold" aria-hidden />
          ) : (
            <SpeakerSlash size={14} weight="bold" aria-hidden />
          )}
          <span>{enabled ? "Reading aloud" : "Read aloud"}</span>
        </button>
      )}
    </div>
  );
}

export function SpeakButton({ text }: { text: string }) {
  function handleClick() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Read question aloud"
      title="Read aloud"
      className="shrink-0 text-neutral-300 hover:text-accent transition-colors mt-0.5"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>
    </button>
  );
}
