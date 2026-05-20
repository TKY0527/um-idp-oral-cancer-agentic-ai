import type {
  ExpertOpinion,
  ExpertRecommendation,
  PanelDiscussion,
  RiskLevel,
  VisualFinding,
} from "@/lib/types/screening";
import { VISUAL_FINDING_LABEL } from "@/lib/utils/riskUtils";

export interface ModeratorInput {
  opinions: ExpertOpinion[];
  triggerReason: string;
  /** The deterministic risk band the rule-based engine already produced. */
  ruleBasedRiskLevel: RiskLevel;
}

const ACTION_SEVERITY: Record<ExpertRecommendation, number> = {
  reassure: 0,
  watchful_wait: 1,
  monitor_2_weeks: 2,
  urgent_referral: 3,
  biopsy_indicated: 4,
};

const ACTION_LABEL: Record<ExpertRecommendation, string> = {
  reassure: "Reassure",
  watchful_wait: "Watchful wait",
  monitor_2_weeks: "Monitor for 2 weeks",
  urgent_referral: "Urgent referral",
  biopsy_indicated: "Biopsy indicated",
};

function mode<T extends string>(items: T[]): { value: T; count: number; tied: T[] } {
  const counts = new Map<T, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  let max = 0;
  for (const v of counts.values()) if (v > max) max = v;
  const top = [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v);
  return { value: top[0], count: max, tied: top };
}

/**
 * Moderator Agent
 *
 * Synthesises a panel of N expert opinions into a single verdict. Pure
 * deterministic logic — no LLM call — so the synthesis is reproducible
 * given the same inputs.
 *
 *   1. Vote on visual finding (mode). Ties broken by the opinion with
 *      the highest confidence.
 *   2. Weighted-mean probability, weighted by each expert's confidence.
 *   3. Compute agreement score: 1.0 if all agree on finding, ~0.66 if
 *      2/3 agree, ~0.33 if all disagree.
 *   4. Take the MOST severe recommended action (we always err on the
 *      side of safety when a panel disagrees).
 *   5. Escalation decision vs the rule-based band:
 *      - If panel max-severity ≥ urgent_referral and rule-band is
 *        Medium  →  escalate
 *      - If panel max-severity ≤ watchful_wait and rule-band is High →
 *        downgrade is *suggested* but never auto-applied
 *      - otherwise  →  keep
 */
export async function runModeratorAgent(
  input: ModeratorInput
): Promise<PanelDiscussion> {
  const { opinions, triggerReason, ruleBasedRiskLevel } = input;

  if (opinions.length === 0) {
    return {
      triggered: false,
      triggerReason,
      opinions: [],
      consensus: "split",
      agreementScore: 0,
      finalFinding: "unclear",
      finalProbability: 0,
      majorityVote: {},
      dissent: "",
      panelDiscussion: "Panel had no opinions to synthesise.",
      synthesizedRecommendation: "",
      escalation: "keep",
    };
  }

  // 1. Vote on visualFindingAssessment
  const findingVote = mode(
    opinions.map((o) => o.visualFindingAssessment as VisualFinding)
  );
  let finalFinding = findingVote.value;
  if (findingVote.tied.length > 1) {
    // Tiebreak: opinion with highest confidence wins.
    const tied = opinions.filter((o) =>
      (findingVote.tied as VisualFinding[]).includes(o.visualFindingAssessment)
    );
    tied.sort((a, b) => b.confidence - a.confidence);
    finalFinding = tied[0].visualFindingAssessment;
  }

  // 2. Confidence-weighted probability
  const totalConf = opinions.reduce((s, o) => s + o.confidence, 0);
  const finalProbability =
    totalConf > 0
      ? opinions.reduce((s, o) => s + o.probabilityEstimate * o.confidence, 0) /
        totalConf
      : opinions[0].probabilityEstimate;

  // 3. Agreement score over visual finding
  const agreementOnFinding = findingVote.count / opinions.length;
  const agreementOnAction = (() => {
    const a = mode(opinions.map((o) => o.recommendedAction));
    return a.count / opinions.length;
  })();
  // Blend the two — agreement is "structural" finding × "actionable" action
  const agreementScore = Number(
    ((agreementOnFinding * 0.6 + agreementOnAction * 0.4)).toFixed(2)
  );

  let consensus: PanelDiscussion["consensus"];
  if (agreementScore >= 0.85) consensus = "agreement";
  else if (agreementScore >= 0.55) consensus = "majority";
  else consensus = "split";

  // 4. Take the most severe action (safety-first)
  const sorted = [...opinions].sort(
    (a, b) =>
      ACTION_SEVERITY[b.recommendedAction] -
      ACTION_SEVERITY[a.recommendedAction]
  );
  const topAction = sorted[0].recommendedAction;

  // 5. Escalation decision
  const maxSeverity = ACTION_SEVERITY[topAction];
  let escalation: PanelDiscussion["escalation"] = "keep";
  if (maxSeverity >= ACTION_SEVERITY["urgent_referral"] && ruleBasedRiskLevel === "Medium") {
    escalation = "escalate";
  } else if (maxSeverity <= ACTION_SEVERITY["watchful_wait"] && ruleBasedRiskLevel === "High") {
    escalation = "downgrade";
  }

  // Majority vote map (UI friendly)
  const majorityVote: Record<string, number> = {};
  for (const o of opinions) {
    majorityVote[o.visualFindingAssessment] =
      (majorityVote[o.visualFindingAssessment] ?? 0) + 1;
  }

  // Build dissent narrative
  const dissentingOpinions = opinions.filter(
    (o) => o.visualFindingAssessment !== finalFinding
  );
  const dissent =
    dissentingOpinions.length === 0
      ? "No dissent — all experts agreed on the visual finding."
      : dissentingOpinions
          .map(
            (o) =>
              `${o.label} disagreed (suggested ${VISUAL_FINDING_LABEL[o.visualFindingAssessment]} → ${ACTION_LABEL[o.recommendedAction]}).`
          )
          .join(" ");

  // Build panel discussion summary
  const lines: string[] = [];
  lines.push(
    `${opinions.length} experts deliberated. ${
      consensus === "agreement"
        ? "Strong agreement"
        : consensus === "majority"
          ? "Majority view"
          : "Split panel"
    } (${(agreementScore * 100).toFixed(0)}% concordance).`
  );
  for (const o of opinions) {
    lines.push(
      `${o.label}: ${VISUAL_FINDING_LABEL[o.visualFindingAssessment]}, ${
        ACTION_LABEL[o.recommendedAction]
      } (confidence ${(o.confidence * 100).toFixed(0)}%).`
    );
  }

  const synthesizedRecommendation =
    `Panel verdict: ${ACTION_LABEL[topAction]}. ` +
    (escalation === "escalate"
      ? `The panel recommends escalating beyond the rule-based ${ruleBasedRiskLevel} band — at least one expert called for urgent specialist review.`
      : escalation === "downgrade"
        ? `The panel suggests the rule-based ${ruleBasedRiskLevel} band may be over-stated; consider watchful wait under clinician supervision.`
        : `The rule-based ${ruleBasedRiskLevel} band aligns with the panel.`);

  return {
    triggered: true,
    triggerReason,
    opinions,
    consensus,
    agreementScore,
    finalFinding,
    finalProbability: Number(finalProbability.toFixed(2)),
    majorityVote,
    dissent,
    panelDiscussion: lines.join(" "),
    synthesizedRecommendation,
    escalation,
  };
}
