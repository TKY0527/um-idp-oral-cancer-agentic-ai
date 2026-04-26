import type { RiskScore } from "@/lib/types/screening";
import { riskLevelColorClass } from "@/lib/utils/riskUtils";

interface Props {
  risk: RiskScore;
}

export function RiskScoreCard({ risk }: Props) {
  const ringColor =
    risk.riskLevel === "Low"
      ? "stroke-emerald-500"
      : risk.riskLevel === "Medium"
        ? "stroke-amber-500"
        : "stroke-red-500";
  const trackColor = "stroke-lavender-100";
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (risk.score / 100) * circumference;

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          📊
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Oral Cancer Risk Score
        </h3>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-32 w-32 flex-shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="12"
              className={trackColor}
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              className={ringColor}
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-lavender-950">
              {risk.score}
            </span>
            <span className="text-xs text-lavender-900/70">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${riskLevelColorClass(
              risk.riskLevel
            )}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {risk.riskLevel} risk
          </span>
          <p className="mt-2 text-xs text-lavender-900/70">
            Confidence: <span className="font-semibold capitalize">{risk.confidenceLevel}</span>
          </p>

          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-lavender-700">
              Top risk drivers
            </p>
            {risk.topRiskDrivers.length === 0 ? (
              <p className="mt-1 text-xs text-lavender-900/70">No significant drivers.</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {risk.topRiskDrivers.map((d, i) => (
                  <li key={i} className="text-xs text-lavender-900">
                    • {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-lavender-50 p-3 text-xs text-lavender-900">
        {risk.scoringExplanation}
      </p>
    </div>
  );
}
