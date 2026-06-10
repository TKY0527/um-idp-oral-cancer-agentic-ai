"use client";

import type { DemoPatientProfile } from "@/lib/data/demoPatients";

interface Props {
  profile: DemoPatientProfile;
  compact?: boolean;
}

function HabitChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        on
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {on ? "⚠ " : "✓ "}
      {label}
    </span>
  );
}

/**
 * Demo patient profile: identity (name, age, race), habits, toothbrush
 * usage times, tooth condition, and the prior dental report.
 */
export function PatientProfileCard({ profile: p, compact }: Props) {
  const reportDate = new Date(
    Date.now() - p.priorReport.daysAgo * 24 * 60 * 60 * 1000
  ).toLocaleDateString();

  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-lavender-100 text-2xl">
          {p.avatar}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-lavender-950">{p.name}</h2>
          <p className="text-xs text-lavender-900/70">
            {p.age} · {p.race} · {p.sex} · {p.occupation}
          </p>
          <p className="text-[11px] text-lavender-900/60">{p.city}</p>
        </div>
        <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-800">
          Demo patient
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <HabitChip on={p.habits.tobacco} label="Tobacco" />
        <HabitChip on={p.habits.alcohol} label="Alcohol" />
        <HabitChip on={p.habits.betelQuid} label="Betel quid" />
        <HabitChip on={p.habits.familyHistory} label="Family history" />
        <span className="rounded-full border border-lavender-200 bg-lavender-50 px-2 py-0.5 text-[10px] font-semibold text-lavender-800">
          Sugar: {p.habits.sugaryDiet}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-lavender-100 bg-lavender-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-800">
          🪥 Toothbrush usage
        </p>
        <p className="mt-1 text-xs text-lavender-950">
          {p.brushing.toothbrush} · {p.brushing.timesPerDay}×/day at{" "}
          <b>{p.brushing.usualTimes.join(" & ")}</b> · avg{" "}
          {Math.round(p.brushing.avgDurationSec)}s · {p.brushing.pressure}{" "}
          pressure · flossing: {p.brushing.flossing}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-lavender-100 bg-lavender-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-800">
          🧾 Dental care record
        </p>
        <p className="mt-1 text-xs text-lavender-950">
          Last scaling (洗牙):{" "}
          <b>
            {new Date(
              Date.now() - p.dentalCare.lastScalingDaysAgo * 24 * 60 * 60 * 1000
            ).toLocaleDateString()}
          </b>{" "}
          ({Math.floor(p.dentalCare.lastScalingDaysAgo / 30)} months ago) ·{" "}
          {p.dentalCare.checkupHabit}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-800">
          🦷 Tooth condition
        </p>
        <p className="mt-1 text-xs leading-relaxed text-lavender-900">
          {p.toothCondition}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {p.knownDentalIssues.map((issue) => (
            <li
              key={issue}
              className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900"
            >
              {issue}
            </li>
          ))}
        </ul>
      </div>

      {!compact && (
        <div className="mt-4 rounded-xl border border-lavender-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-800">
              📄 {p.priorReport.title}
            </p>
            <span className="text-[10px] text-lavender-900/60">
              {reportDate} · {p.priorReport.clinic}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-lavender-900">
            {p.priorReport.summary}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-lavender-900/80">
            {p.priorReport.findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
