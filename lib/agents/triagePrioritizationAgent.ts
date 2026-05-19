import type {
  Questionnaire,
  RiskScore,
  TriagePriority,
  VisionResult,
} from "@/lib/types/screening";

export interface TriageInput {
  risk: RiskScore;
  vision: VisionResult;
  questionnaire: Questionnaire;
}

/**
 * Triage Prioritization Agent
 *
 * Ranks a screening session for the doctor queue. Higher urgency =
 * sooner appointment. Combines risk score with modifiers for lesion
 * duration, bleeding, vision probability, and patient age — the
 * factors a real triage nurse would weight differently from the
 * generic risk score.
 */
export async function runTriagePrioritizationAgent(
  input: TriageInput
): Promise<TriagePriority> {
  const { risk, vision, questionnaire: q } = input;
  const reasons: string[] = [];

  let urgency = risk.score; // start from risk

  if (vision.oralCancerLikeProbability >= 0.7) {
    urgency += 10;
    reasons.push("High vision probability (≥70%)");
  }
  if (q.lesionDurationWeeks >= 4) {
    urgency += 8;
    reasons.push(`Lesion present ≥4 weeks (${q.lesionDurationWeeks}w)`);
  }
  if (q.bleeding) {
    urgency += 6;
    reasons.push("Bleeding reported");
  }
  if (q.age >= 55) {
    urgency += 5;
    reasons.push(`Age ≥55 (${q.age})`);
  }
  if (
    vision.visualFinding === "mixed_white_red_patch_like" ||
    vision.visualFinding === "red_patch_like"
  ) {
    urgency += 6;
    reasons.push(`Erythroplakia-like pattern (${vision.visualFinding})`);
  }

  urgency = Math.max(0, Math.min(100, urgency));

  let recommendedSlaHours: number;
  if (urgency >= 80) recommendedSlaHours = 24;
  else if (urgency >= 60) recommendedSlaHours = 72;
  else if (urgency >= 40) recommendedSlaHours = 168;
  else recommendedSlaHours = 720; // 30 days

  if (reasons.length === 0) reasons.push("No additional escalation factors");

  return {
    urgencyScore: urgency,
    reasons,
    recommendedSlaHours,
  };
}
