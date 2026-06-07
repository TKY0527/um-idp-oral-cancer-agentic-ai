"use client";

import { useMemo, useState } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { CareChat } from "@/components/CareChat";
import { riskLevelColorClass } from "@/lib/utils/riskUtils";
import type { ScreeningSession } from "@/lib/types/screening";

interface PatientGroup {
  ownerId: string;
  label: string;
  channel: "web" | "telegram";
  sessions: ScreeningSession[];
  high: number;
  latest: ScreeningSession;
}

export default function DoctorPatientsPage() {
  const sessions = useSessionStore(10000); // live poll every 10s
  const [selected, setSelected] = useState<string | null>(null);

  const groups = useMemo<PatientGroup[]>(() => {
    const map = new Map<string, ScreeningSession[]>();
    for (const s of sessions) {
      const key = s.ownerId ?? "unknown";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    const out: PatientGroup[] = [];
    for (const [ownerId, arr] of map) {
      const sorted = arr
        .slice()
        .sort(
          (a, b) =>
            new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
        );
      out.push({
        ownerId,
        label: sorted[0].ownerLabel ?? ownerId,
        channel: sorted[0].channel ?? "web",
        sessions: sorted,
        high: arr.filter((s) => s.risk.riskLevel === "High").length,
        latest: sorted[0],
      });
    }
    return out.sort((a, b) => b.high - a.high || b.sessions.length - a.sessions.length);
  }, [sessions]);

  const active = groups.find((g) => g.ownerId === selected) ?? null;

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-lavender-950">Patients</h1>
        <p className="text-sm text-lavender-700">
          Every patient who has run a screening (web or Telegram). Click to see
          their track record and message them.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-lavender-200 bg-white p-8 text-center text-sm text-lavender-600 shadow-card">
          No patient screenings yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Patient list */}
          <div className="space-y-2">
            {groups.map((g) => (
              <button
                key={g.ownerId}
                type="button"
                onClick={() => setSelected(g.ownerId)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected === g.ownerId
                    ? "border-lavender-500 bg-lavender-50 ring-1 ring-lavender-400"
                    : "border-lavender-200 bg-white hover:border-lavender-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {g.channel === "telegram" ? "📲" : "🧑"}
                  </span>
                  <span className="text-sm font-semibold text-lavender-950">
                    {g.label}
                  </span>
                  {g.high > 0 && (
                    <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      {g.high} high
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-lavender-600">
                  {g.sessions.length} screening(s) · latest{" "}
                  {new Date(g.latest.finishedAt).toLocaleDateString()} ·{" "}
                  <span
                    className={`rounded px-1 ${riskLevelColorClass(
                      g.latest.risk.riskLevel
                    )}`}
                  >
                    {g.latest.risk.riskLevel}
                  </span>
                </p>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="space-y-4">
            {active ? (
              <>
                <div className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {active.channel === "telegram" ? "📲" : "🧑"}
                    </span>
                    <h2 className="text-lg font-bold text-lavender-950">
                      {active.label}
                    </h2>
                    <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-lavender-700">
                      {active.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-lavender-600">
                    Track record · {active.sessions.length} screening(s)
                  </p>
                  <div className="mt-3 space-y-1">
                    {active.sessions.map((s) => (
                      <a
                        key={s.sessionId}
                        href={`/doctor/session/${s.sessionId}`}
                        className="flex items-center justify-between rounded-lg border border-lavender-100 bg-lavender-50/40 px-3 py-2 text-xs hover:bg-lavender-100"
                      >
                        <span className="text-lavender-900">
                          {new Date(s.finishedAt).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{s.risk.score}/100</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-medium ${riskLevelColorClass(
                              s.risk.riskLevel
                            )}`}
                          >
                            {s.risk.riskLevel}
                          </span>
                          {s.clinicianReview && <span title="Reviewed">✅</span>}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                <CareChat
                  viewerRole="doctor"
                  patientId={active.ownerId}
                  title={`Message ${active.label}`}
                  heightClass="h-72"
                />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-lavender-300 bg-white/50 p-10 text-center text-sm text-lavender-500">
                Select a patient on the left to view their record & chat.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
