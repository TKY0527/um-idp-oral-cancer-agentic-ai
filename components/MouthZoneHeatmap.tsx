"use client";

import type { ZoneCoverage } from "@/lib/data/demoPatients";

interface Props {
  zones: ZoneCoverage[];
}

function colorFor(pct: number): { bg: string; text: string } {
  if (pct >= 85) return { bg: "#10b981", text: "#ffffff" }; // great
  if (pct >= 70) return { bg: "#6ee7b7", text: "#065f46" }; // good
  if (pct >= 55) return { bg: "#fcd34d", text: "#78350f" }; // fair
  if (pct >= 40) return { bg: "#fb923c", text: "#7c2d12" }; // weak
  return { bg: "#ef4444", text: "#ffffff" }; // poor
}

const ORDER: ZoneCoverage["zone"][] = [
  "upper_left",
  "upper_front",
  "upper_right",
  "lower_left",
  "lower_front",
  "lower_right",
];

/**
 * Mouth-zone brushing coverage heatmap from the smart-toothbrush telemetry:
 * a 2×3 grid (upper/lower × left/front/right) colored by average coverage.
 * Red zones are where the brush rarely reaches.
 */
export function MouthZoneHeatmap({ zones }: Props) {
  const byZone = new Map(zones.map((z) => [z.zone, z]));
  const ordered = ORDER.map((key) => byZone.get(key)).filter(
    (z): z is ZoneCoverage => Boolean(z)
  );
  const weakest = [...ordered].sort(
    (a, b) => a.coveragePercent - b.coveragePercent
  )[0];

  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <h3 className="text-sm font-semibold text-lavender-950">
        🗺️ Brushing coverage heatmap
      </h3>
      <p className="text-[11px] text-lavender-900/60">
        Average smart-toothbrush coverage per mouth zone (14 days)
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {ordered.map((z) => {
          const c = colorFor(z.coveragePercent);
          return (
            <div
              key={z.zone}
              className="flex flex-col items-center justify-center rounded-xl px-2 py-4"
              style={{ backgroundColor: c.bg, color: c.text }}
              title={`${z.label}: ${z.coveragePercent}% coverage`}
            >
              <span className="text-lg font-bold">{z.coveragePercent}%</span>
              <span className="text-[10px] font-medium opacity-90">
                {z.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-lavender-900/70">
          <span>poor</span>
          {["#ef4444", "#fb923c", "#fcd34d", "#6ee7b7", "#10b981"].map((c) => (
            <span
              key={c}
              className="inline-block h-2.5 w-5 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>great</span>
        </div>
        {weakest && weakest.coveragePercent < 70 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
            Weak spot: {weakest.label.toLowerCase()}
          </span>
        )}
      </div>
    </article>
  );
}
