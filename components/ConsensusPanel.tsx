import type { ConsensusReport } from "@/lib/types/screening";
import { VISUAL_FINDING_LABEL, formatPercent } from "@/lib/utils/riskUtils";

interface Props {
  consensus: ConsensusReport;
}

const AGREEMENT_TONE: Record<
  ConsensusReport["agreement"],
  { label: string; bg: string; text: string; ring: string }
> = {
  strong: {
    label: "Strong agreement",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    ring: "ring-emerald-300",
  },
  partial: {
    label: "Partial agreement",
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-amber-300",
  },
  weak: {
    label: "Weak agreement",
    bg: "bg-orange-100",
    text: "text-orange-800",
    ring: "ring-orange-300",
  },
  conflict: {
    label: "Providers conflict",
    bg: "bg-red-100",
    text: "text-red-800",
    ring: "ring-red-300",
  },
};

export function ConsensusPanel({ consensus }: Props) {
  const tone = AGREEMENT_TONE[consensus.agreement];

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🤝
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Multi-LLM Consensus
        </h3>
        <span
          className={`ml-auto rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
        >
          {tone.label} · {formatPercent(consensus.agreementScore)}
        </span>
      </div>
      <p className="mt-2 text-xs text-lavender-900/70">{consensus.note}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ProviderColumn
          name={`${consensus.primaryProvider.toUpperCase()} (primary)`}
          finding={consensus.primary.visualFinding}
          region={consensus.primary.suspectedRegion}
          prob={consensus.primary.oralCancerLikeProbability}
          quality={consensus.primary.imageQuality}
        />
        <ProviderColumn
          name={`${consensus.secondaryProvider.toUpperCase()} (cross-check)`}
          finding={consensus.secondary.visualFinding}
          region={consensus.secondary.suspectedRegion}
          prob={consensus.secondary.oralCancerLikeProbability}
          quality={consensus.secondary.imageQuality}
        />
      </div>
    </div>
  );
}

function ProviderColumn({
  name,
  finding,
  region,
  prob,
  quality,
}: {
  name: string;
  finding: string;
  region: string;
  prob: number;
  quality: string;
}) {
  return (
    <div className="rounded-xl border border-lavender-100 bg-lavender-50/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-lavender-700">
        {name}
      </p>
      <p className="mt-1 text-sm font-semibold text-lavender-950">
        {VISUAL_FINDING_LABEL[finding as keyof typeof VISUAL_FINDING_LABEL] ??
          finding}
      </p>
      <dl className="mt-2 space-y-1 text-[11px] text-lavender-900/80">
        <div className="flex justify-between">
          <dt>Region</dt>
          <dd className="capitalize">{region}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Probability</dt>
          <dd className="font-mono">{formatPercent(prob)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Image quality</dt>
          <dd className="capitalize">{quality}</dd>
        </div>
      </dl>
    </div>
  );
}
