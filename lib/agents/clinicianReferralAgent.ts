import type {
  ClinicianReferral,
  Questionnaire,
  RiskScore,
  ToothbrushTelemetry,
  VisionResult,
} from "@/lib/types/screening";
import {
  SCREENING_DISCLAIMER,
  VISUAL_FINDING_LABEL,
  summarizeQuestionnaire,
} from "@/lib/utils/riskUtils";

export interface ClinicianReferralInput {
  vision: VisionResult;
  risk: RiskScore;
  toothbrush: ToothbrushTelemetry;
  questionnaire: Questionnaire;
}

const SUGGESTED_ACTION =
  "Review oral cavity clinically, compare with patient history, and consider further examination or biopsy if clinically indicated.";

/**
 * Clinician Referral Agent
 *
 * Builds a structured referral packet to assist a dentist or oral medicine
 * specialist. Only generated for High-risk sessions.
 */
export async function runClinicianReferralAgent(
  input: ClinicianReferralInput
): Promise<ClinicianReferral> {
  const { vision, risk, toothbrush, questionnaire } = input;

  const sessionQuality =
    toothbrush.imageQualityScore >= 0.8
      ? "Good (acceptable for prototype screening)"
      : toothbrush.imageQualityScore >= 0.5
        ? "Moderate (interpret with caution)"
        : "Poor (rescan recommended)";

  const summary =
    `Prototype agentic AI oral cancer screening flagged a ${risk.riskLevel}-risk session ` +
    `(score ${risk.score}/100). Primary visual finding: ${VISUAL_FINDING_LABEL[vision.visualFinding]} ` +
    `${vision.suspectedRegion !== "none" && vision.suspectedRegion !== "unknown" ? `at ${vision.suspectedRegion}` : ""}.`.trim();

  return {
    referralRequired: true,
    summary,
    riskScore: risk.score,
    riskDrivers: risk.topRiskDrivers,
    visualFinding: VISUAL_FINDING_LABEL[vision.visualFinding],
    suspectedRegion: vision.suspectedRegion,
    questionnaireSummary: summarizeQuestionnaire(questionnaire),
    toothbrushSessionQuality: sessionQuality,
    suggestedClinicianAction: SUGGESTED_ACTION,
    disclaimer: SCREENING_DISCLAIMER,
  };
}
