import type { ToothbrushTelemetry } from "@/lib/types/screening";

interface Props {
  telemetry: ToothbrushTelemetry;
}

export function ToothbrushTelemetryCard({ telemetry }: Props) {
  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🪥
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Smart Toothbrush Telemetry
        </h3>
      </div>
      <p className="mt-1 text-xs text-lavender-900/70">
        Simulated by the Toothbrush IoT Agent.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Duration" value={`${telemetry.brushingDurationSec}s`} />
        <Stat label="Pressure" value={telemetry.pressureLevel} capitalize />
        <Stat label="Motion blur" value={telemetry.motionBlurScore.toFixed(2)} />
        <Stat
          label="Image quality"
          value={telemetry.imageQualityScore.toFixed(2)}
        />
        <Stat label="Coverage" value={`${telemetry.coveragePercent}%`} />
        <Stat
          label="Session valid"
          value={telemetry.sessionValid ? "yes" : "no"}
          good={telemetry.sessionValid}
          bad={!telemetry.sessionValid}
        />
      </dl>

      <p className="mt-4 rounded-lg bg-lavender-50 p-3 text-xs text-lavender-900">
        {telemetry.note}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  capitalize,
  good,
  bad,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  good?: boolean;
  bad?: boolean;
}) {
  const tone = good
    ? "text-emerald-700"
    : bad
      ? "text-red-700"
      : "text-lavender-950";
  return (
    <div className="rounded-lg border border-lavender-100 bg-lavender-50/50 p-2">
      <dt className="text-[10px] uppercase tracking-wider text-lavender-700">
        {label}
      </dt>
      <dd
        className={`text-base font-semibold ${tone} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
