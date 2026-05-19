"use client";

import Link from "next/link";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { sessionStore } from "@/lib/store/sessionStore";
import { RiskTrendChart } from "@/components/RiskTrendChart";
import { riskLevelColorClass } from "@/lib/utils/riskUtils";

export default function PatientHistoryPage() {
  const sessions = useSessionStore();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-lavender-950">Screening history</h1>
        <p className="text-sm text-lavender-900/70">
          Every session is stored locally on this device. You can clear them anytime.
        </p>
      </header>

      <RiskTrendChart sessions={sessions} />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-lavender-950">All sessions</h2>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete ALL screening sessions on this device?")) {
                  sessionStore.clear();
                }
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Clear all
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-lavender-300 bg-white/60 p-8 text-center">
            <p className="text-sm text-lavender-900/70">
              No screenings yet.{" "}
              <Link href="/patient/screening" className="font-semibold text-lavender-700 underline">
                Start your first screening
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.sessionId}
                className="flex items-center gap-3 rounded-2xl border border-lavender-200 bg-white p-3 shadow-card"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskLevelColorClass(
                    s.risk.riskLevel
                  )}`}
                >
                  {s.risk.riskLevel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-lavender-950">
                    {s.patientReport.headline}
                  </p>
                  <p className="text-[11px] text-lavender-700">
                    {new Date(s.finishedAt).toLocaleString()} · score {s.risk.score}/100
                    {s.providerStatus.used !== "mock" && (
                      <> · {s.providerStatus.used}</>
                    )}
                    {s.consensus && (
                      <> · consensus {s.consensus.agreement}</>
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-lavender-100 px-2 py-0.5 font-mono text-[10px] text-lavender-800">
                  {s.sessionId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete session ${s.sessionId}?`)) {
                      sessionStore.remove(s.sessionId);
                    }
                  }}
                  className="rounded-md px-2 py-1 text-xs text-lavender-700 hover:bg-lavender-50"
                  aria-label="Delete session"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
