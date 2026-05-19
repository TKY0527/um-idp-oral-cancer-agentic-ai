"use client";

import type { ScreeningSession } from "@/lib/types/screening";

interface Props {
  sessions: ScreeningSession[];
}

/**
 * Compact SVG line chart of risk score over time.
 *
 * Pure SVG (no dependency) so it stays fast and themeable. The path is
 * built from the sessions sorted oldest-first; each dot is colored by
 * its risk band (green/amber/red).
 */
export function RiskTrendChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-lavender-300 bg-white/60 p-8 text-center text-sm text-lavender-700">
        No screenings yet — run one to see your trend here.
      </div>
    );
  }
  // Sort oldest → newest for the chart.
  const series = [...sessions]
    .sort(
      (a, b) =>
        new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
    )
    .map((s) => ({
      score: s.risk.score,
      level: s.risk.riskLevel,
      ts: new Date(s.finishedAt),
    }));

  const W = 640;
  const H = 220;
  const padding = { l: 36, r: 12, t: 12, b: 28 };
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;
  const n = series.length;

  const xFor = (i: number) =>
    n === 1 ? padding.l + innerW / 2 : padding.l + (i / (n - 1)) * innerW;
  const yFor = (score: number) =>
    padding.t + innerH - (score / 100) * innerH;

  const points = series.map((s, i) => `${xFor(i)},${yFor(s.score)}`).join(" ");

  const bandColor = (level: ScreeningSession["risk"]["riskLevel"]) =>
    level === "Low"
      ? "#10b981"
      : level === "Medium"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          📈
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Risk score over time
        </h3>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        {/* Risk band backgrounds */}
        <rect
          x={padding.l}
          y={yFor(100)}
          width={innerW}
          height={yFor(60) - yFor(100)}
          fill="#fee2e2"
          opacity="0.5"
        />
        <rect
          x={padding.l}
          y={yFor(60)}
          width={innerW}
          height={yFor(30) - yFor(60)}
          fill="#fef3c7"
          opacity="0.5"
        />
        <rect
          x={padding.l}
          y={yFor(30)}
          width={innerW}
          height={yFor(0) - yFor(30)}
          fill="#d1fae5"
          opacity="0.5"
        />

        {/* Y-axis labels */}
        {[0, 30, 60, 100].map((y) => (
          <g key={y}>
            <text
              x={padding.l - 6}
              y={yFor(y) + 3}
              textAnchor="end"
              fontSize="10"
              fill="#5d35a3"
              className="font-mono"
            >
              {y}
            </text>
            <line
              x1={padding.l}
              x2={W - padding.r}
              y1={yFor(y)}
              y2={yFor(y)}
              stroke="#e6d9ff"
              strokeDasharray="2 3"
            />
          </g>
        ))}

        {/* Line */}
        <polyline
          fill="none"
          stroke="#8b54e6"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />

        {/* Dots */}
        {series.map((s, i) => (
          <g key={i}>
            <circle
              cx={xFor(i)}
              cy={yFor(s.score)}
              r="5"
              fill={bandColor(s.level)}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* X-axis: first / middle / last */}
        {series.length > 0 && (
          <>
            <text
              x={xFor(0)}
              y={H - 8}
              textAnchor="start"
              fontSize="9"
              fill="#5d35a3"
            >
              {series[0].ts.toLocaleDateString()}
            </text>
            {series.length > 1 && (
              <text
                x={xFor(n - 1)}
                y={H - 8}
                textAnchor="end"
                fontSize="9"
                fill="#5d35a3"
              >
                {series[n - 1].ts.toLocaleDateString()}
              </text>
            )}
          </>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-lavender-900/80">
        <Legend color="#10b981" label="Low (0–29)" />
        <Legend color="#f59e0b" label="Medium (30–59)" />
        <Legend color="#ef4444" label="High (60–100)" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
