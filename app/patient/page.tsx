"use client";

import Link from "next/link";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { riskLevelColorClass } from "@/lib/utils/riskUtils";

export default function PatientHomePage() {
  const sessions = useSessionStore();
  const latest = sessions[0];
  const total = sessions.length;
  const highCount = sessions.filter((s) => s.risk.riskLevel === "High").length;
  const mediumCount = sessions.filter((s) => s.risk.riskLevel === "Medium").length;
  const lowCount = sessions.filter((s) => s.risk.riskLevel === "Low").length;

  const firstRun = sessions.length === 0;

  return (
    <div>
      <header className="rounded-3xl border border-lavender-200 bg-gradient-to-br from-lavender-100 via-white to-lavender-50 p-8 shadow-card">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-lavender-300 bg-white/70 px-3 py-1 text-xs font-medium text-lavender-800 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-lavender-500" />
          Patient Dashboard
        </div>
        <h1 className="text-3xl font-bold text-lavender-950">
          {firstRun ? "Welcome! 👋" : "Welcome back 👋"}
        </h1>
        <p className="mt-1 text-lavender-800">
          Track your oral health over time. Your data lives only on this device.
        </p>
      </header>

      {firstRun && (
        <section className="mt-6 rounded-3xl border border-lavender-300 bg-white p-6 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-lavender-100 text-xl">
              👋
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-lavender-950">
                First time here? Here&apos;s how it works.
              </h2>
              <ol className="mt-2 space-y-2 text-sm text-lavender-900">
                <li>
                  <b>1.</b> Open <b>New Screening</b> in the menu.
                </li>
                <li>
                  <b>2.</b> Choose a built-in sample case <i>or</i> take a picture of your mouth with your camera.
                </li>
                <li>
                  <b>3.</b> Answer a short questionnaire — only takes about a minute.
                </li>
                <li>
                  <b>4.</b> Click <b>Run Agentic AI Screening</b>. The result will appear with a clear Low / Medium / High band and what to do next.
                </li>
              </ol>
              <p className="mt-3 rounded-lg border border-lavender-200 bg-lavender-50 p-3 text-xs text-lavender-900">
                <b>Important:</b> This is an educational prototype, not a medical
                device. Results are screening hints only — always see a dentist
                for a real diagnosis.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/patient/screening"
                  className="rounded-xl bg-lavender-700 px-4 py-2 text-sm font-semibold text-white hover:bg-lavender-800"
                >
                  Start your first screening →
                </Link>
                <Link
                  href="/patient/chat"
                  className="rounded-xl border border-lavender-300 bg-white px-4 py-2 text-sm font-semibold text-lavender-800 hover:bg-lavender-100"
                >
                  Or ask the AI Assistant first
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total screenings" value={total.toString()} />
        <Stat label="Low risk" value={lowCount.toString()} tone="emerald" />
        <Stat label="Medium risk" value={mediumCount.toString()} tone="amber" />
        <Stat label="High risk" value={highCount.toString()} tone="red" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-lavender-950">
            Your latest screening
          </h2>
          {latest ? (
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${riskLevelColorClass(
                  latest.risk.riskLevel
                )}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {latest.risk.riskLevel} risk · score {latest.risk.score}/100
              </span>
              <p className="mt-3 text-sm text-lavender-900">
                {latest.patientReport.headline}
              </p>
              <p className="mt-1 text-xs text-lavender-700">
                {new Date(latest.finishedAt).toLocaleString()}
              </p>
              <Link
                href="/patient/history"
                className="mt-3 inline-block rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-xs font-medium text-lavender-800 hover:bg-lavender-100"
              >
                View full history →
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-lavender-900/70">
                You haven&apos;t run a screening yet.
              </p>
              <Link
                href="/patient/screening"
                className="mt-3 inline-block rounded-lg bg-lavender-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-lavender-800"
              >
                Start your first screening →
              </Link>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-lavender-950">
            Quick actions
          </h2>
          <div className="mt-3 grid gap-2">
            <Link
              href="/patient/screening"
              className="flex items-center justify-between rounded-lg border border-lavender-200 bg-lavender-50/50 px-3 py-2 text-sm hover:bg-lavender-100"
            >
              <span>🔬 New screening</span>
              <span className="text-lavender-600">→</span>
            </Link>
            <Link
              href="/patient/chat"
              className="flex items-center justify-between rounded-lg border border-lavender-200 bg-lavender-50/50 px-3 py-2 text-sm hover:bg-lavender-100"
            >
              <span>💬 Ask the AI Assistant</span>
              <span className="text-lavender-600">→</span>
            </Link>
            <Link
              href="/patient/history"
              className="flex items-center justify-between rounded-lg border border-lavender-200 bg-lavender-50/50 px-3 py-2 text-sm hover:bg-lavender-100"
            >
              <span>📅 View history & trends</span>
              <span className="text-lavender-600">→</span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "lavender",
}: {
  label: string;
  value: string;
  tone?: "lavender" | "emerald" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "from-emerald-100 to-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "amber"
        ? "from-amber-100 to-amber-50 text-amber-900 border-amber-200"
        : tone === "red"
          ? "from-red-100 to-red-50 text-red-900 border-red-200"
          : "from-lavender-100 to-lavender-50 text-lavender-900 border-lavender-200";
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-card ${toneClass}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
