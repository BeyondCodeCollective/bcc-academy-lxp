"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatCircle, X, PaperPlaneTilt } from "@phosphor-icons/react";

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Hey! I'm your AI guidance counselor. Ask me anything about career paths, courses, or where to start.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    // Placeholder response — will connect to API later
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Thanks for your question! This chat will be connected to an AI career counselor soon. In the meantime, try our Career Quiz to get personalized recommendations.",
        },
      ]);
    }, 1000);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-cobalt text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Close chat" : "Open AI guidance counselor"}
      >
        {isOpen ? <X size={24} weight="bold" /> : <ChatCircle size={24} weight="bold" />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-white border-2 border-black/10 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "480px" }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-cobalt/20 bg-cobalt text-white">
              <p className="font-display font-bold text-sm">AI Guidance Counselor</p>
              <p className="text-xs text-white/60 mt-0.5">Here to help you navigate</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-black text-white"
                        : "bg-gray-100 text-black"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-4 py-3 border-t border-black/10 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2.5 text-sm border border-black/10 bg-gray-50 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-11 h-11 flex items-center justify-center bg-cobalt text-white disabled:opacity-30 hover:bg-dark-cobalt transition-colors"
              >
                <PaperPlaneTilt size={18} weight="bold" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
