"use client";

import { useState, useRef, useEffect } from "react";
import { useProgram } from "@/lib/programs/context";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function welcomeMessageFor(programName: string): string {
  return `Hey! I'm your AI study buddy for ${programName}. Ask me anything about this week's material — or anything from class you want to go deeper on.`;
}

export default function TutorPage() {
  const program = useProgram();
  const welcome = welcomeMessageFor(program.name);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: welcome },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply || "Sorry, I couldn't process that. Try again?",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleNewTopic() {
    setMessages([
      { id: "welcome", role: "assistant", content: welcome },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-[calc(100dvh-var(--nav-height,49px))] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">AI Tutor</h1>
          <p className="text-xs text-neutral-600">
            Your {program.name} study companion
          </p>
        </div>
        <button
          onClick={handleNewTopic}
          className="border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          New Topic
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 bg-neutral-100 px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={handleSend}
          className="mx-auto flex max-w-xl items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:opacity-30"
          >
            ✉️
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-xl text-center text-[11px] text-neutral-500">
          AI can make mistakes. Double-check anything important.
        </p>
      </div>
    </div>
  );
}
