"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, Flag, CheckCircle, NotebookPen, TerminalSquare } from "lucide-react";
import { MAX_HISTORY_MESSAGES } from "@/lib/instructor/prompt";

// The instructor runs the session in this panel. Voice first: the learner
// talks (browser speech recognition), the instructor's reply can be read
// aloud (browser speech synthesis). Typing stays as the fallback. Everything
// the instructor DID this turn (ran something in the lab, saved a note, filed a
// flag) shows as a small card under the reply, so the learner sees work
// happening without ever seeing code.

type Message = { id: string; role: "user" | "assistant"; content: string; events?: InstructorEvent[] };
type InstructorEvent =
  | { type: "lab"; command: string; exitCode: number; preview: string }
  | { type: "note"; key: string; value: string }
  | { type: "flag"; reason: string; note: string }
  | { type: "complete" };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function InstructorPanel({
  trackSlug,
  weekNumber,
  unitName,
  sessionTitle,
  firstName,
  initiallyComplete,
}: {
  trackSlug: string;
  weekNumber: number;
  unitName: string;
  sessionTitle: string;
  firstName: string | null;
  initiallyComplete: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(initiallyComplete);
  const [listening, setListening] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCanListen(!!getRecognition());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function speak(text: string) {
    if (!readAloud || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }

  async function send(text: string, history: Message[]) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { id: `${Date.now()}`, role: "user", content: trimmed };
    const next = [...history, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/instructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackSlug,
          weekNumber,
          voice: listening || readAloud,
          messages: next.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json()) as { reply?: string; events?: InstructorEvent[] };
      const reply = data.reply || "I didn't catch that. Say it once more?";
      const events = data.events ?? [];
      if (events.some((e) => e.type === "complete")) setComplete(true);
      setMessages((prev) => [...prev, { id: `${Date.now() + 1}`, role: "assistant", content: reply, events }]);
      speak(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now() + 1}`, role: "assistant", content: "Something went wrong on my end. Say that again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function begin() {
    setStarted(true);
    void send(firstName ? `Hi, I'm ${firstName}. Let's start ${unitName}.` : `Let's start ${unitName}.`, []);
  }

  function toggleListening() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput(finalText || interim);
    };
    rec.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (text) {
        setMessages((prev) => {
          void send(text, prev);
          return prev;
        });
      }
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <section className="mb-8 panel overflow-hidden" aria-label="Instructor">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">Instructor</p>
          <p className="truncate text-sm font-semibold text-ink">{sessionTitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {complete && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
              <CheckCircle size={14} /> Complete
            </span>
          )}
          <button
            type="button"
            onClick={() => setReadAloud((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-tint"
            aria-pressed={readAloud}
            aria-label={readAloud ? "Stop reading replies aloud" : "Read replies aloud"}
            title={readAloud ? "Reading aloud" : "Read aloud"}
          >
            {readAloud ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {!started ? (
        <div className="px-4 py-6">
          <p className="max-w-[52ch] text-sm leading-relaxed text-ink-soft">
            Your instructor runs this session with you, one step at a time, and does the hands-on work in a lab
            it controls. You talk or type. You never install anything or write code.
          </p>
          <button
            type="button"
            onClick={begin}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-6 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Start {unitName}
          </button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="max-h-[60vh] min-h-[280px] overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[88%] space-y-2">
                    <div
                      className={`whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
                        m.role === "user" ? "bg-ink text-white" : "bg-paper-tint text-ink"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.events?.map((ev, i) => <EventCard key={i} ev={ev} />)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 bg-paper-tint px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input, messages);
            }}
            className="flex items-end gap-2 border-t border-rule px-4 py-3"
          >
            {canListen && (
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full transition-colors ${
                  listening ? "bg-accent text-white" : "bg-paper-tint text-ink hover:bg-paper-tint-soft"
                }`}
                aria-pressed={listening}
                aria-label={listening ? "Stop listening" : "Talk to the instructor"}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input, messages);
                }
              }}
              placeholder={listening ? "Listening…" : "Talk, or type"}
              className="max-h-40 flex-1 resize-none border border-rule bg-neutral-50 px-3.5 py-3 text-base text-ink placeholder:text-ink-faint transition-all focus:border-ink focus:bg-white focus:outline-none focus:ring-1 focus:ring-ink-faint"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center bg-ink text-white transition-colors hover:bg-ink/90 disabled:opacity-30"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function EventCard({ ev }: { ev: InstructorEvent }) {
  if (ev.type === "lab") {
    return (
      <div className="border border-rule bg-white px-3 py-2 text-xs text-ink-soft">
        <p className="flex items-center gap-1.5 font-medium text-ink">
          <TerminalSquare size={13} className="text-ink-faint" /> {ev.command}
          {ev.exitCode !== 0 && <span className="text-amber-700">(didn&apos;t finish cleanly)</span>}
        </p>
        {ev.preview && <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-snug">{ev.preview}</pre>}
      </div>
    );
  }
  if (ev.type === "note") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-soft">
        <NotebookPen size={13} className="text-ink-faint" /> Saved to your deployment: <span className="font-medium text-ink">{ev.key.replace(/_/g, " ")}</span>
      </p>
    );
  }
  if (ev.type === "flag") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-amber-800">
        <Flag size={13} /> On the office-hours agenda: {ev.note}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
      <CheckCircle size={13} /> Session complete
    </p>
  );
}
