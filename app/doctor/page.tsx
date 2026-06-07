"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import {
  VISUAL_FINDING_LABEL,
  riskLevelColorClass,
} from "@/lib/utils/riskUtils";

type SortMode = "urgency" | "newest" | "risk";
type FilterMode = "all" | "high" | "medium" | "low" | "unreviewed";

export default function DoctorQueuePage() {
  const sessions = useSessionStore(10000); // live: re-pull every 10s
  const [sortMode, setSortMode] = useState<SortMode>("urgency");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const queue = useMemo(() => {
    let list = [...sessions];

    if (filterMode === "high") list = list.filter((s) => s.risk.riskLevel === "High");
    else if (filterMode === "medium") list = list.filter((s) => s.risk.riskLevel === "Medium");
    else if (filterMode === "low") list = list.filter((s) => s.risk.riskLevel === "Low");
    else if (filterMode === "unreviewed") list = list.filter((s) => !s.clinicianReview);

    if (sortMode === "urgency") {
      list.sort(
        (a, b) =>
          (b.triage?.urgencyScore ?? b.risk.score) -
          (a.triage?.urgencyScore ?? a.risk.score)
      );
    } else if (sortMode === "risk") {
      list.sort((a, b) => b.risk.score - a.risk.score);
    } else {
      list.sort(
        (a, b) =>
          new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
      );
    }

    return list;
  }, [sessions, sortMode, filterMode]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const high = sessions.filter((s) => s.risk.riskLevel === "High").length;
    const unreviewed = sessions.filter((s) => !s.clinicianReview).length;
    const avgUrgency =
      sessions.reduce(
        (acc, s) => acc + (s.triage?.urgencyScore ?? s.risk.score),
        0
      ) / Math.max(1, total);
    return { total, high, unreviewed, avgUrgency };
  }, [sessions]);

  return (
    <div>
      <header className="mb-6 rounded-3xl border border-lavender-200 bg-gradient-to-br from-lavender-100 via-white to-lavender-50 p-6 shadow-card">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-lavender-300 bg-white/70 px-3 py-1 text-xs font-medium text-lavender-800 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Clinician Console · Triage Queue
        </div>
        <h1 className="text-2xl font-bold text-lavender-950">
          Oral cancer triage queue
        </h1>
        <p className="text-sm text-lavender-900/70">
          Sessions prioritized by the Triage Agent. Highest urgency at top by default.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total sessions" value={stats.total.toString()} />
        <Stat label="High risk" value={stats.high.toString()} tone="red" />
        <Stat label="Unreviewed" value={stats.unreviewed.toString()} tone="amber" />
        <Stat
          label="Avg urgency"
          value={stats.avgUrgency.toFixed(0)}
          tone="lavender"
        />
      </section>

      <section className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lavender-700">
            Sort:
          </span>
          <Pill
            active={sortMode === "urgency"}
            onClick={() => setSortMode("urgency")}
          >
            Urgency
          </Pill>
          <Pill
            active={sortMode === "risk"}
            onClick={() => setSortMode("risk")}
          >
            Risk score
          </Pill>
          <Pill
            active={sortMode === "newest"}
            onClick={() => setSortMode("newest")}
          >
            Newest
          </Pill>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lavender-700">
            Filter:
          </span>
          <Pill
            active={filterMode === "all"}
            onClick={() => setFilterMode("all")}
          >
            All
          </Pill>
          <Pill
            active={filterMode === "high"}
            onClick={() => setFilterMode("high")}
          >
            High
          </Pill>
          <Pill
            active={filterMode === "medium"}
            onClick={() => setFilterMode("medium")}
          >
            Medium
          </Pill>
          <Pill
            active={filterMode === "low"}
            onClick={() => setFilterMode("low")}
          >
            Low
          </Pill>
          <Pill
            active={filterMode === "unreviewed"}
            onClick={() => setFilterMode("unreviewed")}
          >
            Unreviewed
          </Pill>
        </div>
      </section>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-lavender-300 bg-white/60 p-10 text-center">
          <p className="text-sm text-lavender-900/70">
            No sessions match. Have a patient run a screening from the{" "}
            <Link
              href="/patient/screening"
              className="font-semibold text-lavender-700 underline"
            >
              Patient Dashboard
            </Link>{" "}
            first.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {queue.map((s, idx) => (
            <li
              key={s.sessionId}
              className="flex items-center gap-3 rounded-2xl border border-lavender-200 bg-white p-3 shadow-card transition-colors hover:border-lavender-400"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lavender-100 font-mono text-xs font-bold text-lavender-800">
                #{idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskLevelColorClass(
                      s.risk.riskLevel
                    )}`}
                  >
                    {s.risk.riskLevel}
                  </span>
                  <span className="text-sm font-medium text-lavender-950">
                    {VISUAL_FINDING_LABEL[s.vision.visualFinding]}
                  </span>
                  <span className="text-[11px] text-lavender-700 capitalize">
                    · {s.vision.suspectedRegion}
                  </span>
                  {s.clinicianReview && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      reviewed
                    </span>
                  )}
                  {s.consensus && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      consensus {s.consensus.agreement}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-lavender-700">
                  <span className="font-medium text-lavender-900">
                    {s.channel === "telegram" ? "📲 " : "🧑 "}
                    {s.ownerLabel ?? "Unknown patient"}
                  </span>{" "}
                  · {new Date(s.finishedAt).toLocaleString()} · age{" "}
                  {s.questionnaire.age} · score {s.risk.score}/100
                  {s.triage && (
                    <> · urgency {s.triage.urgencyScore} (SLA {s.triage.recommendedSlaHours}h)</>
                  )}
                </p>
              </div>
              <Link
                href={`/doctor/session/${s.sessionId}`}
                className="rounded-lg bg-lavender-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-lavender-800"
              >
                Review →
              </Link>
            </li>
          ))}
        </ul>
      )}
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
  tone?: "lavender" | "amber" | "red";
}) {
  const toneClass =
    tone === "amber"
      ? "from-amber-100 to-amber-50 text-amber-900 border-amber-200"
      : tone === "red"
        ? "from-red-100 to-red-50 text-red-900 border-red-200"
        : "from-lavender-100 to-lavender-50 text-lavender-900 border-lavender-200";
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-card ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-lavender-700 text-white"
          : "border border-lavender-300 bg-white text-lavender-800 hover:bg-lavender-100"
      }`}
    >
      {children}
    </button>
  );
}
