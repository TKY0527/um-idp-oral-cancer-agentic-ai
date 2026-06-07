"use client";

import { useEffect, useRef, useState } from "react";
import type { CareMessage } from "@/lib/types/screening";

interface Props {
  /** Doctor must pass the target patientId. Patient omits it (server forces self). */
  patientId?: string;
  /** "doctor" | "patient" — controls bubble alignment/labels. */
  viewerRole: "doctor" | "patient";
  title?: string;
  heightClass?: string;
}

export function CareChat({
  patientId,
  viewerRole,
  title,
  heightClass = "h-80",
}: Props) {
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
    try {
      const res = await fetch(`/api/messages${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: CareMessage[] };
      setMessages(data.messages ?? []);
    } catch {
      /* offline */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, text: t }),
      });
      if (res.ok) {
        setText("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          ✉️
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          {title ?? (viewerRole === "doctor" ? "Message patient" : "Message your clinician")}
        </h3>
      </div>

      <div
        className={`mt-3 ${heightClass} space-y-2 overflow-y-auto rounded-xl border border-lavender-100 bg-lavender-50/40 p-3`}
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-lavender-500">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.from === viewerRole;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                    mine
                      ? "bg-lavender-600 text-white"
                      : m.from === "doctor"
                        ? "bg-white text-lavender-950 ring-1 ring-lavender-200"
                        : "bg-white text-lavender-950 ring-1 ring-lavender-200"
                  }`}
                >
                  <p className="mb-0.5 text-[10px] font-semibold opacity-80">
                    {m.from === "doctor" ? "🩺 " : "🧑 "}
                    {m.fromLabel}
                  </p>
                  <p className="leading-snug">{m.text}</p>
                  <p className="mt-0.5 text-[9px] opacity-60">
                    {new Date(m.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-lavender-700 px-4 py-2 text-sm font-semibold text-white hover:bg-lavender-800 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
