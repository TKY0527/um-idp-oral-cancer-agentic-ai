import type { PanelDiscussion } from "@/lib/types/screening";
import { VISUAL_FINDING_LABEL, formatPercent } from "@/lib/utils/riskUtils";

interface Props {
  panel: PanelDiscussion;
}

const CONSENSUS_TONE: Record<
  PanelDiscussion["consensus"],
  { label: string; bg: string; text: string; ring: string }
> = {
  agreement: {
    label: "Strong agreement",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    ring: "ring-emerald-300",
  },
  majority: {
    label: "Majority view",
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-amber-300",
  },
  split: {
    label: "Panel split",
    bg: "bg-red-100",
    text: "text-red-800",
    ring: "ring-red-300",
  },
};

const ESCALATION_LABEL: Record<PanelDiscussion["escalation"], string> = {
  escalate: "⬆️ Escalation suggested",
  keep: "≈ Aligned with rule-based band",
  downgrade: "⬇️ Downgrade considered",
};

export function ModeratorVerdictCard({ panel }: Props) {
  const tone = CONSENSUS_TONE[panel.consensus];

  return (
    <div className="rounded-2xl border-2 border-lavender-300 bg-gradient-to-br from-lavender-50 to-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          📋
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Moderator Verdict
        </h3>
        <span
          className={`ml-auto rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
        >
          {tone.label} · {formatPercent(panel.agreementScore)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Block label="Final finding (panel)">
          <p className="text-base font-semibold text-lavender-950">
            {VISUAL_FINDING_LABEL[panel.finalFinding]}
          </p>
          <p className="text-xs text-lavender-700">
            Synthesized probability {formatPercent(panel.finalProbability)}
          </p>
        </Block>

        <Block label="Escalation decision">
          <p className="text-base font-semibold text-lavender-950">
            {ESCALATION_LABEL[panel.escalation]}
          </p>
        </Block>
      </div>

      {/* Majority vote bar */}
      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-700">
          Vote distribution
        </p>
        <div className="mt-2 space-y-1">
          {Object.entries(panel.majorityVote).map(([finding, n]) => {
            const pct = (n / panel.opinions.length) * 100;
            return (
              <div key={finding}>
                <div className="flex items-center justify-between text-[11px] text-lavender-900">
                  <span>
                    {VISUAL_FINDING_LABEL[
                      finding as keyof typeof VISUAL_FINDING_LABEL
                    ] ?? finding}
                  </span>
                  <span className="font-mono">
                    {n} / {panel.opinions.length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-lavender-100">
                  <div
                    className="h-full rounded-full bg-lavender-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-lavender-50 p-3 text-xs text-lavender-900">
        <p className="font-semibold">{panel.synthesizedRecommendation}</p>
        <p className="mt-1 text-lavender-700">{panel.panelDiscussion}</p>
        {panel.dissent && (
          <p className="mt-2 text-[11px] italic text-amber-800">
            ⚠ {panel.dissent}
          </p>
        )}
      </div>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-lavender-100 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-700">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
