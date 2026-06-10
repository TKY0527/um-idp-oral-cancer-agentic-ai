"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatRole } from "@/lib/types/screening";
import { byokKeysOrUndefined } from "@/lib/utils/byok";

interface Props {
  patientId: string;
  patientLabel: string;
  heightClass?: string;
}

interface ToolTraceEntry {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
}

interface Turn {
  role: ChatRole;
  content: string;
  /** Agentic tool calls the server-side loop made to produce this reply. */
  trace?: ToolTraceEntry[];
}

const QUICK_PROMPTS = [
  "Summarise this patient's screening history",
  "Is the risk trend improving or worsening?",
  "Does this patient need scaling (洗牙)?",
  "Any red flags that would support a referral?",
];

const COHORT_PROMPTS = [
  "Which patient should I see first, and why?",
  "Rank all patients by urgency",
  "Who is overdue for scaling?",
  "Compare the cancer risk across all patients",
];

/**
 * The doctor's AI agent: ask free-form questions about the selected
 * patient's screening history. The server loads the full history and the
 * agent answers with concrete numbers (multi-provider, BYOK-aware).
 */
export function DoctorAssistantPanel({
  patientId,
  patientLabel,
  heightClass = "h-80",
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Guards in-flight replies: a response for patient A must never be
  // written into the thread after the doctor switched to patient B.
  const activePatientRef = useRef(patientId);

  // New patient selected → fresh conversation.
  useEffect(() => {
    activePatientRef.current = patientId;
    setTurns([]);
    setError(null);
    setBusy(false);
  }, [patientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    const next: Turn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/doctor/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          messages: next,
          apiKeys: byokKeysOrUndefined(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (activePatientRef.current !== patientId) return; // stale reply
      setTurns([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? "(empty reply)",
          trace: Array.isArray(data.trace) ? data.trace : undefined,
        },
      ]);
    } catch (err) {
      if (activePatientRef.current !== patientId) return; // stale error
      setError(err instanceof Error ? err.message : "Request failed");
      setTurns(next);
    } finally {
      if (activePatientRef.current === patientId) setBusy(false);
    }
  }

  const cohortMode = patientId === "*";
  const prompts = cohortMode ? COHORT_PROMPTS : QUICK_PROMPTS;

  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-base">🤖</span>
        <h3 className="text-sm font-semibold text-lavender-950">
          {cohortMode
            ? "AI Triage Agent — which patient first?"
            : `AI Assistant — screen ${patientLabel}'s history`}
        </h3>
        <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-bold text-lavender-800">
          agentic tool loop
        </span>
      </div>

      <div
        ref={scrollRef}
        className={`mt-3 ${heightClass} space-y-2 overflow-y-auto rounded-xl border border-lavender-100 bg-lavender-50/40 p-3`}
      >
        {turns.length === 0 && !busy && (
          <div>
            <p className="text-xs text-lavender-900/70">
              {cohortMode
                ? "The agent compares every patient via its tools — try a quick prompt:"
                : "Ask anything about this patient's screenings — try a quick prompt:"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-lavender-300 bg-white px-2.5 py-1 text-[11px] text-lavender-800 hover:bg-lavender-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((m, i) => (
          <div key={i}>
            {/* Agentic tool-use trace: which tools the loop called */}
            {m.role === "assistant" && m.trace && m.trace.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {m.trace.map((t, j) => (
                  <span
                    key={j}
                    className="rounded-full border border-lavender-200 bg-lavender-100/70 px-2 py-0.5 font-mono text-[10px] text-lavender-700"
                    title={JSON.stringify(t.args)}
                  >
                    🔧 {t.tool} {t.ok ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            )}
            <div
              className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-lavender-700 text-white"
                  : "bg-white text-lavender-950 shadow-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="w-fit rounded-xl bg-white px-3 py-2 text-xs text-lavender-700 shadow-sm">
            🔧 Agent loop running — calling tools…
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-800">
          {error}
        </p>
      )}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            cohortMode
              ? "e.g. Who needs an appointment this week?"
              : "e.g. Should this patient be prioritised?"
          }
          disabled={busy}
          className="flex-1 rounded-lg border border-lavender-300 bg-white px-3 py-2 text-xs focus:border-lavender-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-lavender-700 px-4 py-2 text-xs font-semibold text-white hover:bg-lavender-800 disabled:bg-lavender-300"
        >
          Ask
        </button>
      </form>
      <p className="mt-1.5 text-[10px] text-lavender-900/50">
        Prototype decision-support — not a diagnosis. Works with backend keys
        or your pasted demo key (ChatGPT / Gemini / Claude).
      </p>
    </article>
  );
}
