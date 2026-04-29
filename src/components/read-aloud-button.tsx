"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeakerHigh, Stop } from "@phosphor-icons/react";

// Read-aloud uses the browser's built-in Web Speech API (speechSynthesis).
// Zero runtime cost, works offline, voice quality depends on OS — macOS
// and iOS are solid, Android is OK, Windows varies. If the browser doesn't
// support the API, the button renders nothing.

// Prefer higher-quality voices. Chrome ships "Google US English" (neural,
// non-local) which is far better than the OS default. Microsoft Edge ships
// "Microsoft Aria Online (Natural)" and similar. We rank:
//   1. Any voice whose name contains "Google"
//   2. Any voice whose name contains "Natural" (MS Edge neural)
//   3. Any non-local (cloud-backed) voice
//   4. First available voice for the language
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const code = lang.split("-")[0];
  const matching = voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(code),
  );
  const pool = matching.length ? matching : voices;
  return (
    pool.find((v) => v.name.includes("Google")) ??
    pool.find((v) => v.name.includes("Natural")) ??
    pool.find((v) => !v.localService) ??
    pool[0] ??
    null
  );
}

// Tags whose text should be skipped when extracting the page for narration.
// We narrate headings, paragraphs, legends, labels, links. We skip anything
// interactive (buttons, form controls) and the top navigation.
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NAV",
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "FOOTER",
]);

function extractReadableText(root: Element): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let parent = node.parentElement;
      while (parent && parent !== root) {
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.getAttribute("aria-hidden") === "true") {
          return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentElement;
      }
      const text = node.textContent?.trim();
      return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent?.trim();
    if (text) parts.push(text);
  }
  return parts.join(". ");
}

// Some browsers (notably Chrome) cut off utterances longer than a few
// hundred characters. Queue smaller chunks instead.
function chunkForSpeech(text: string, maxLen = 200): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const next = current ? `${current} ${s}` : s;
    if (next.length > maxLen && current) {
      chunks.push(current);
      current = s;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function ReadAloudButton({
  selector = "#main-content",
  label = "Read aloud",
}: {
  selector?: string;
  label?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // Keep a ref so start() always sees the latest voices without re-renders.
  const voicesReady = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    // Voices load asynchronously — fire the event or poll until available.
    const onVoicesChanged = () => {
      voicesReady.current = window.speechSynthesis.getVoices().length > 0;
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    onVoicesChanged(); // already loaded in some browsers

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        onVoicesChanged,
      );
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  function start() {
    const root = document.querySelector(selector);
    if (!root) return;
    const text = extractReadableText(root);
    if (!text) return;

    const lang = document.documentElement.lang || "en-US";
    const voice = pickVoice(lang);

    window.speechSynthesis.cancel();
    const chunks = chunkForSpeech(text);
    chunks.forEach((chunk, idx) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 0.95;
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      if (idx === chunks.length - 1) {
        utterance.onend = () => setSpeaking(false);
      }
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    });
    setSpeaking(true);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : start())}
      aria-label={speaking ? "Stop reading aloud" : label}
      aria-pressed={speaking}
      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
    >
      {speaking ? (
        <Stop size={14} weight="fill" aria-hidden="true" />
      ) : (
        <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
      )}
      <span>{speaking ? "Stop" : label}</span>
    </button>
  );
}
