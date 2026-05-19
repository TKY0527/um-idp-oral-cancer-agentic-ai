"use client";

import { useEffect, useState } from "react";

export type ToastTone = "success" | "info" | "warn" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

let listeners: Array<(t: ToastItem) => void> = [];

/**
 * Imperative API — call from anywhere (event handlers, async code) without
 * needing a React context provider chain. The <ToastViewport /> picks them
 * up via the listener pub-sub below.
 */
export function showToast(message: string, tone: ToastTone = "info") {
  const item: ToastItem = {
    id: Math.random().toString(36).slice(2),
    message,
    tone,
  };
  for (const l of listeners) l(item);
}

const TONE_CLASS: Record<ToastTone, string> = {
  success: "bg-emerald-50 border-emerald-300 text-emerald-900",
  info: "bg-lavender-50 border-lavender-300 text-lavender-900",
  warn: "bg-amber-50 border-amber-300 text-amber-900",
  error: "bg-red-50 border-red-300 text-red-900",
};

const TONE_ICON: Record<ToastTone, string> = {
  success: "✅",
  info: "💬",
  warn: "⚠️",
  error: "❌",
};

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      // Auto-dismiss after 4 seconds.
      setTimeout(() => {
        setItems((prev) => prev.filter((p) => p.id !== t.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-card backdrop-blur ${TONE_CLASS[t.tone]}`}
          style={{ minWidth: 240, maxWidth: 360 }}
        >
          <span aria-hidden>{TONE_ICON[t.tone]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() =>
              setItems((prev) => prev.filter((p) => p.id !== t.id))
            }
            aria-label="Dismiss"
            className="text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
