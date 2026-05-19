"use client";

import { useMemo } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { VISUAL_FINDING_LABEL } from "@/lib/utils/riskUtils";

export default function DoctorAnalyticsPage() {
  const sessions = useSessionStore();

  const stats = useMemo(() => {
    const total = sessions.length;
    const high = sessions.filter((s) => s.risk.riskLevel === "High").length;
    const medium = sessions.filter((s) => s.risk.riskLevel === "Medium").length;
    const low = sessions.filter((s) => s.risk.riskLevel === "Low").length;
    const reviewed = sessions.filter((s) => s.clinicianReview).length;

    const reviewDecisions = sessions.reduce(
      (acc, s) => {
        if (!s.clinicianReview) return acc;
        acc[s.clinicianReview.decision] =
          (acc[s.clinicianReview.decision] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Agreement rate between AI band and clinician
    const aiVsClinician = sessions.filter((s) => s.clinicianReview).reduce(
      (acc, s) => {
        if (!s.clinicianReview) return acc;
        if (s.clinicianReview.decision === "agree") acc.agree += 1;
        else acc.disagree += 1;
        return acc;
      },
      { agree: 0, disagree: 0 }
    );

    const findingCounts = sessions.reduce(
      (acc, s) => {
        acc[s.vision.visualFinding] = (acc[s.vision.visualFinding] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const providerCounts = sessions.reduce(
      (acc, s) => {
        acc[s.providerStatus.used] = (acc[s.providerStatus.used] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgScore =
      sessions.reduce((acc, s) => acc + s.risk.score, 0) / Math.max(1, total);
    const avgUrgency =
      sessions.reduce((acc, s) => acc + (s.triage?.urgencyScore ?? s.risk.score), 0) /
      Math.max(1, total);

    return {
      total,
      high,
      medium,
      low,
      reviewed,
      reviewDecisions,
      aiVsClinician,
      findingCounts,
      providerCounts,
      avgScore,
      avgUrgency,
    };
  }, [sessions]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-lavender-950">Cohort analytics</h1>
        <p className="text-sm text-lavender-900/70">
          Aggregate view across all sessions on this device. No PII leaves your browser.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total" value={stats.total.toString()} />
        <Stat label="Reviewed" value={stats.reviewed.toString()} />
        <Stat label="Avg score" value={stats.avgScore.toFixed(0)} />
        <Stat label="Avg urgency" value={stats.avgUrgency.toFixed(0)} />
        <Stat
          label="AI/clinician agree"
          value={
            stats.aiVsClinician.agree + stats.aiVsClinician.disagree > 0
              ? `${(
                  (100 * stats.aiVsClinician.agree) /
                  (stats.aiVsClinician.agree + stats.aiVsClinician.disagree)
                ).toFixed(0)}%`
              : "—"
          }
          tone="emerald"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Risk band distribution">
          <Bar label="Low" value={stats.low} max={stats.total} tone="emerald" />
          <Bar label="Medium" value={stats.medium} max={stats.total} tone="amber" />
          <Bar label="High" value={stats.high} max={stats.total} tone="red" />
        </Card>

        <Card title="Visual finding distribution">
          {Object.entries(stats.findingCounts).length === 0 ? (
            <p className="text-xs text-lavender-700">No sessions yet.</p>
          ) : (
            Object.entries(stats.findingCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([f, n]) => (
                <Bar
                  key={f}
                  label={
                    VISUAL_FINDING_LABEL[
                      f as keyof typeof VISUAL_FINDING_LABEL
                    ] ?? f
                  }
                  value={n}
                  max={stats.total}
                  tone="lavender"
                />
              ))
          )}
        </Card>

        <Card title="Vision provider usage">
          {Object.entries(stats.providerCounts).length === 0 ? (
            <p className="text-xs text-lavender-700">No sessions yet.</p>
          ) : (
            Object.entries(stats.providerCounts).map(([p, n]) => (
              <Bar
                key={p}
                label={p}
                value={n}
                max={stats.total}
                tone="lavender"
              />
            ))
          )}
        </Card>

        <Card title="Clinician review decisions">
          {Object.entries(stats.reviewDecisions).length === 0 ? (
            <p className="text-xs text-lavender-700">No reviews yet.</p>
          ) : (
            Object.entries(stats.reviewDecisions).map(([d, n]) => (
              <Bar
                key={d}
                label={d.replace(/_/g, " ")}
                value={n}
                max={stats.reviewed}
                tone="lavender"
              />
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-lavender-950">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </article>
  );
}

function Stat({
  label,
  value,
  tone = "lavender",
}: {
  label: string;
  value: string;
  tone?: "lavender" | "emerald";
}) {
  const c =
    tone === "emerald"
      ? "from-emerald-100 to-emerald-50 text-emerald-900 border-emerald-200"
      : "from-lavender-100 to-lavender-50 text-lavender-900 border-lavender-200";
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-card ${c}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "emerald" | "amber" | "red" | "lavender";
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const colour =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "red"
          ? "bg-red-500"
          : "bg-lavender-600";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-lavender-900">
        <span className="capitalize">{label}</span>
        <span className="font-mono">
          {value}
          <span className="text-lavender-600"> / {max}</span>
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-lavender-100">
        <div
          className={`h-full rounded-full ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
