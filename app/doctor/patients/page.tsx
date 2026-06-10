"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { sessionStore } from "@/lib/store/sessionStore";
import { CareChat } from "@/components/CareChat";
import { DoctorAssistantPanel } from "@/components/DoctorAssistantPanel";
import { PatientProfileCard } from "@/components/PatientProfileCard";
import { BrushingHabitsChart } from "@/components/BrushingHabitsChart";
import { MouthZoneHeatmap } from "@/components/MouthZoneHeatmap";
import { getDemoPatientByPatientId } from "@/lib/data/demoPatients";
import { riskLevelColorClass } from "@/lib/utils/riskUtils";
import type { PatientDocument, ScreeningSession } from "@/lib/types/screening";

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
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  // One-click demo data: seeds Aisyah / Tan / Muthu with their histories.
  async function seedDemo() {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (res.ok) {
        void sessionStore.hydrate(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setSeedError(data.error ?? `Seeding failed (HTTP ${res.status})`);
      }
    } catch {
      setSeedError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSeeding(false);
    }
  }

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

  const [docs, setDocs] = useState<PatientDocument[]>([]);
  useEffect(() => {
    setDocs([]);
    if (!selected) return;
    fetch(`/api/documents?patientId=${encodeURIComponent(selected)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => undefined);
  }, [selected]);

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-lavender-950">Patients</h1>
          <p className="text-sm text-lavender-700">
            Every patient who has run a screening (web or Telegram). Click to see
            their track record, ask the AI assistant, and message them.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={seedDemo}
            disabled={seeding}
            className="rounded-xl border border-lavender-300 bg-white px-4 py-2 text-xs font-semibold text-lavender-800 hover:bg-lavender-100 disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "🌱 Load demo patients"}
          </button>
          {seedError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
              {seedError}
            </p>
          )}
        </div>
      </header>

      {/* Cohort triage: the agent compares ALL patients via its tools and
          tells the doctor who to see first (你判断那个病人合适). */}
      <div className="mb-4">
        <DoctorAssistantPanel
          key="cohort"
          patientId="*"
          patientLabel="All patients"
          heightClass="h-56"
        />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-lavender-200 bg-white p-8 text-center text-sm text-lavender-600 shadow-card">
          <p>No patient screenings yet.</p>
          <button
            type="button"
            onClick={seedDemo}
            disabled={seeding}
            className="mt-3 rounded-xl bg-lavender-700 px-4 py-2 text-xs font-semibold text-white hover:bg-lavender-800 disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "🌱 Load demo patients (Aisyah, Tan, Muthu)"}
          </button>
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
                {/* Demo patient profile (name, race, habits, toothbrush times,
                    tooth condition, prior report) + charts */}
                {(() => {
                  const profile = getDemoPatientByPatientId(active.ownerId);
                  if (!profile) return null;
                  return (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <PatientProfileCard profile={profile} />
                      <div className="grid gap-4">
                        <BrushingHabitsChart
                          log={profile.brushingLog}
                          usualTimes={profile.brushing.usualTimes}
                        />
                        <MouthZoneHeatmap zones={profile.zoneCoverage} />
                      </div>
                    </div>
                  );
                })()}

                {/* The doctor's AI agent: screen this patient's history.
                    Keyed by patient so switching remounts a fresh thread. */}
                <DoctorAssistantPanel
                  key={active.ownerId}
                  patientId={active.ownerId}
                  patientLabel={active.label}
                />

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

                {docs.length > 0 && (
                  <div className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-700">
                      Patient-uploaded reports ({docs.length})
                    </p>
                    <ul className="mt-2 space-y-1">
                      {docs.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-2 rounded-lg border border-lavender-100 bg-lavender-50/40 px-3 py-2 text-xs"
                        >
                          <span>{d.mimeType.includes("pdf") ? "📄" : "🖼️"}</span>
                          <span className="min-w-0 flex-1 truncate text-lavender-900">
                            {d.fileName}
                            {d.note ? ` · ${d.note}` : ""}
                          </span>
                          <a
                            href={d.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-lavender-300 px-2 py-0.5 font-medium text-lavender-800 hover:bg-lavender-100"
                          >
                            View
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
