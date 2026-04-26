import type { VisionResult } from "@/lib/types/screening";
import {
  VISUAL_FINDING_LABEL,
  formatPercent,
} from "@/lib/utils/riskUtils";

interface Props {
  vision: VisionResult;
}

export function VisionResultCard({ vision }: Props) {
  const qualityTone =
    vision.imageQuality === "good"
      ? "bg-emerald-100 text-emerald-800"
      : vision.imageQuality === "moderate"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          👁️
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Vision Screening Result
        </h3>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${qualityTone}`}>
          image: {vision.imageQuality}
        </span>
      </div>

      <p className="mt-3 text-lg font-semibold text-lavender-950">
        {VISUAL_FINDING_LABEL[vision.visualFinding]}
      </p>
      <p className="text-xs text-lavender-900/70">
        Region: <span className="capitalize">{vision.suspectedRegion}</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Bar
          label="Oral cancer-like probability (prototype)"
          value={vision.oralCancerLikeProbability}
          color="bg-lavender-600"
        />
        <Bar label="Model confidence" value={vision.confidence} color="bg-lavender-400" />
      </div>

      <p className="mt-4 rounded-lg bg-lavender-50 p-3 text-xs text-lavender-900">
        {vision.observationSummary}
      </p>

      <p className="mt-3 text-[11px] italic text-lavender-700">{vision.disclaimer}</p>
    </div>
  );
}

function Bar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-lavender-900/80">
        <span>{label}</span>
        <span className="font-semibold text-lavender-950">{formatPercent(pct)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-lavender-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
