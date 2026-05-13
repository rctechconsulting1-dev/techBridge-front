"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/aiAgent";

const API_URL =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001")
    : "http://localhost:5001";

interface Props {
  websiteId: number;
}

export function ChatWidget({ websiteId }: Props) {
  const [active, setActive]     = useState(false);
  const [open, setOpen]         = useState(false);
  const [greeting, setGreeting] = useState("Hi! How can I help you today?");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sessionId]             = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check if agent is active for this website
  useEffect(() => {
    fetch(`${API_URL}/api/public/ai-agent/${websiteId}/status`)
      .then((r) => (r.ok ? r.json() : { active: false }))
      .then((d) => {
        if (d.active) {
          setActive(true);
          if (d.greeting) setGreeting(d.greeting);
        }
      })
      .catch(() => {}); // silently ignore — widget stays hidden
  }, [websiteId]);

  // Show greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, greeting, messages.length]);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/public/ai-agent/${websiteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          // Send history excluding the message we just added (backend appends it)
          conversationHistory: messages,
        }),
      });

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "You're sending messages too quickly. Please wait a moment and try again." },
        ]);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer ?? "Sorry, I couldn't get a response right now." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!active) return null;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:right-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-[var(--cms-primary,#CD7F32)] px-4 py-3">
            <span className="text-sm font-semibold text-white">Chat with us</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-lg leading-none text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex max-h-80 flex-col overflow-y-auto space-y-3 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--cms-primary,#CD7F32)] text-white"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {msg.content}
                </p>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <p className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-400 dark:bg-gray-800">
                  …
                </p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="flex gap-2 border-t border-gray-100 p-3 dark:border-gray-700">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Type a message…"
              disabled={loading}
              maxLength={1000}
              className="flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-[var(--cms-primary,#CD7F32)] disabled:opacity-50 dark:border-gray-700 dark:text-white"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[var(--cms-primary,#CD7F32)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--cms-primary,#CD7F32)] text-2xl text-white shadow-lg transition-transform hover:scale-105 sm:right-6"
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
