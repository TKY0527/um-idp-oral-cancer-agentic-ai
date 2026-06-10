"use client";

import type { BrushingDay } from "@/lib/data/demoPatients";

interface Props {
  log: BrushingDay[];
  usualTimes: string[];
}

const W = 640;
const H = 200;
const PAD_L = 36;
const PAD_B = 26;
const PAD_T = 16;
const TARGET_SEC = 120; // dentist-recommended 2 minutes

/**
 * 14-day smart-toothbrush log: one bar per day (brushing duration), with
 * the 2-minute target line. Days with zero sessions show as "missed".
 */
export function BrushingHabitsChart({ log, usualTimes }: Props) {
  const days = [...log].sort((a, b) => b.daysAgo - a.daysAgo);
  const maxSec = Math.max(TARGET_SEC + 20, ...days.map((d) => d.durationSec));
  const innerW = W - PAD_L - 8;
  const innerH = H - PAD_T - PAD_B;
  const barW = Math.floor(innerW / days.length) - 6;

  const y = (sec: number) => PAD_T + innerH - (sec / maxSec) * innerH;

  function dayLabel(daysAgo: number): string {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-lavender-950">
          🪥 Brushing log — last 14 days
        </h3>
        <span className="text-[10px] text-lavender-900/60">
          usual times: {usualTimes.join(" & ")}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Bar chart of daily brushing duration over the last 14 days"
      >
        {/* Y axis labels */}
        {[0, 60, 120, 180].
          filter((s) => s <= maxSec).
          map((s) => (
          <g key={s}>
            <line
              x1={PAD_L}
              y1={y(s)}
              x2={W - 8}
              y2={y(s)}
              stroke="#e7e3f6"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={y(s) + 3}
              textAnchor="end"
              fontSize={9}
              fill="#7a6fae"
            >
              {s / 60}m
            </text>
          </g>
        ))}

        {/* 2-minute target line */}
        <line
          x1={PAD_L}
          y1={y(TARGET_SEC)}
          x2={W - 8}
          y2={y(TARGET_SEC)}
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <text x={W - 10} y={y(TARGET_SEC) - 4} textAnchor="end" fontSize={9} fill="#059669">
          2-min target
        </text>

        {/* Bars */}
        {days.map((d, i) => {
          const x = PAD_L + 3 + i * (innerW / days.length);
          const missed = d.sessions === 0;
          const reached = d.durationSec >= TARGET_SEC;
          return (
            <g key={d.daysAgo}>
              {missed ? (
                <rect
                  x={x}
                  y={y(20)}
                  width={barW}
                  height={PAD_T + innerH - y(20)}
                  fill="#fee2e2"
                  stroke="#fca5a5"
                  strokeDasharray="3 2"
                  rx={3}
                />
              ) : (
                <rect
                  x={x}
                  y={y(d.durationSec)}
                  width={barW}
                  height={PAD_T + innerH - y(d.durationSec)}
                  fill={reached ? "#34d399" : "#a78bfa"}
                  rx={3}
                />
              )}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 12}
                textAnchor="middle"
                fontSize={8}
                fill="#7a6fae"
              >
                {dayLabel(d.daysAgo)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-lavender-900/70">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          reached 2 min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-400" />
          below 2 min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-red-300 bg-red-100" />
          missed day
        </span>
      </div>
    </article>
  );
}
