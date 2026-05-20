import type {
  ExpertOpinion,
  ExpertRecommendation,
  ExpertRole,
  PanelDiscussion,
} from "@/lib/types/screening";
import { VISUAL_FINDING_LABEL, formatPercent } from "@/lib/utils/riskUtils";

interface Props {
  panel: PanelDiscussion;
  /** When true, strip extra technical bits suitable for patient view. */
  patientMode?: boolean;
}

const ROLE_META: Record<
  ExpertRole,
  { emoji: string; tone: string; ring: string; accent: string }
> = {
  oral_pathologist: {
    emoji: "🔬",
    tone: "from-rose-50 to-white border-rose-200",
    ring: "ring-rose-300",
    accent: "text-rose-800",
  },
  epidemiologist: {
    emoji: "📊",
    tone: "from-sky-50 to-white border-sky-200",
    ring: "ring-sky-300",
    accent: "text-sky-800",
  },
  general_dentist: {
    emoji: "🦷",
    tone: "from-emerald-50 to-white border-emerald-200",
    ring: "ring-emerald-300",
    accent: "text-emerald-800",
  },
};

const ACTION_LABEL: Record<ExpertRecommendation, string> = {
  reassure: "Reassure",
  watchful_wait: "Watchful wait",
  monitor_2_weeks: "Monitor 2 weeks",
  urgent_referral: "Urgent referral",
  biopsy_indicated: "Biopsy indicated",
};

const ACTION_TONE: Record<ExpertRecommendation, string> = {
  reassure: "bg-emerald-100 text-emerald-800",
  watchful_wait: "bg-emerald-100 text-emerald-800",
  monitor_2_weeks: "bg-amber-100 text-amber-800",
  urgent_referral: "bg-red-100 text-red-800",
  biopsy_indicated: "bg-red-200 text-red-900",
};

export function ExpertPanelCard({ panel, patientMode }: Props) {
  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🧑‍⚕️
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Multi-Expert Panel
        </h3>
        <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-medium text-lavender-700">
          {panel.opinions.length} experts
        </span>
      </div>
      <p className="mt-1 text-xs text-lavender-900/70">
        {patientMode
          ? "Three specialist AI experts reviewed your case from different angles."
          : panel.triggerReason}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {panel.opinions.map((o) => (
          <ExpertColumn key={o.expertRole} opinion={o} />
        ))}
      </div>
    </div>
  );
}

function ExpertColumn({ opinion }: { opinion: ExpertOpinion }) {
  const meta = ROLE_META[opinion.expertRole];
  return (
    <article
      className={`flex flex-col rounded-xl border bg-gradient-to-br p-3 ${meta.tone}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {meta.emoji}
        </span>
        <div>
          <p className={`text-sm font-bold ${meta.accent}`}>{opinion.label}</p>
          <p className="text-[10px] uppercase tracking-wider text-lavender-700">
            {opinion.provider}
            {opinion.fellBackToMock ? " (mock)" : ""}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-mono text-lavender-700">
          conf {formatPercent(opinion.confidence)}
        </span>
      </div>

      <p className="mt-3 text-xs font-semibold text-lavender-950">
        {VISUAL_FINDING_LABEL[opinion.visualFindingAssessment]}
      </p>
      <p className="text-[11px] text-lavender-700">
        Probability {formatPercent(opinion.probabilityEstimate)}
      </p>

      <span
        className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
          ACTION_TONE[opinion.recommendedAction]
        }`}
      >
        ▶ {ACTION_LABEL[opinion.recommendedAction]}
      </span>

      {opinion.reasoning && (
        <p className="mt-2 text-[11px] leading-snug text-lavender-900/90">
          {opinion.reasoning}
        </p>
      )}

      {opinion.keyConcerns.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-lavender-900">
          {opinion.keyConcerns.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
      )}

      {opinion.questionsToAsk.length > 0 && (
        <details className="mt-2 text-[11px] text-lavender-700">
          <summary className="cursor-pointer">
            Questions this expert would ask
          </summary>
          <ul className="mt-1 space-y-0.5">
            {opinion.questionsToAsk.map((q, i) => (
              <li key={i}>• {q}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
