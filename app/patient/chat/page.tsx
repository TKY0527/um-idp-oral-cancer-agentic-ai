"use client";

import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import type { ChatMessage } from "@/lib/types/screening";

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STARTER_PROMPTS = [
  "What does my latest risk score mean?",
  "How can I self-check my mouth at home?",
  "What does a 'white patch' on the tongue mean?",
  "When should I see a dentist?",
];

export default function PatientChatPage() {
  const sessions = useSessionStore();
  const latest = sessions[0];
  const patientContext = latest
    ? {
        latestRiskLevel: latest.risk.riskLevel,
        latestScore: latest.risk.score,
        latestFinding: latest.vision.visualFinding,
      }
    : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: newId(),
      role: "assistant",
      content:
        "Hi! I'm your AI Health Assistant. I can explain your screening results, " +
        "answer general questions about oral cancer, and tell you when to see a dentist. " +
        "Ask me anything — but remember I'm a prototype, not a doctor.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          patientContext,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = data.reply ?? `(error) ${data.error ?? "Unknown error"}`;
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content:
            "I'm having trouble reaching the AI right now. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-lavender-950">AI Health Assistant</h1>
        <p className="text-sm text-lavender-900/70">
          Powered by Gemini (or a safe offline fallback if no key is set). Not a doctor.
        </p>
        {latest && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-lavender-100 px-3 py-1 text-xs text-lavender-800">
            <span className="h-1.5 w-1.5 rounded-full bg-lavender-500" />
            Context: latest risk {latest.risk.riskLevel} ({latest.risk.score}/100)
          </p>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-lavender-200 bg-white/70 p-4 shadow-card backdrop-blur"
      >
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-lavender-700">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-lavender-500" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-lavender-500 [animation-delay:120ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-lavender-500 [animation-delay:240ms]" />
              <span className="ml-2">Assistant is typing…</span>
            </div>
          )}
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              disabled={sending}
              className="rounded-full border border-lavender-300 bg-white px-3 py-1.5 text-xs text-lavender-800 hover:bg-lavender-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
          placeholder="Ask anything about your oral health…"
          className="flex-1 rounded-xl border border-lavender-300 bg-white px-4 py-3 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-xl bg-lavender-700 px-4 py-3 text-sm font-semibold text-white hover:bg-lavender-800 disabled:bg-lavender-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-snug shadow-sm ${
          isUser
            ? "bg-lavender-700 text-white"
            : "border border-lavender-200 bg-white text-lavender-950"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p
          className={`mt-1 text-[10px] ${
            isUser ? "text-lavender-200" : "text-lavender-600"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
