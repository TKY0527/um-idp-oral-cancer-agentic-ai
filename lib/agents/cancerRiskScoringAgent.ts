import type {
  Questionnaire,
  RiskScore,
  ToothbrushTelemetry,
  VisionResult,
} from "@/lib/types/screening";
import {
  VISUAL_FINDING_LABEL,
  VISUAL_FINDING_SCORES,
  categorizeRisk,
  clamp,
  confidenceLevelFromNumeric,
} from "@/lib/utils/riskUtils";

export interface RiskScoringInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
  toothbrush: ToothbrushTelemetry;
}

interface Driver {
  label: string;
  weight: number;
}

/**
 * Cancer Risk Scoring Agent
 *
 * Combines the vision finding, the patient questionnaire, and the toothbrush
 * session quality into a 0–100 oral cancer-like risk score with categorical
 * Low/Medium/High and a transparent breakdown of the top drivers.
 */
export async function runCancerRiskScoringAgent(
  input: RiskScoringInput
): Promise<RiskScore> {
  const { vision, questionnaire: q, toothbrush } = input;
  const drivers: Driver[] = [];

  // Visual finding contribution.
  const findingScore = VISUAL_FINDING_SCORES[vision.visualFinding] ?? 0;
  if (findingScore > 0) {
    drivers.push({
      label: `Visual finding: ${VISUAL_FINDING_LABEL[vision.visualFinding]}`,
      weight: findingScore,
    });
  }

  // Vision probability contribution.
  let probScore = 0;
  if (vision.oralCancerLikeProbability >= 0.7) probScore = 25;
  else if (vision.oralCancerLikeProbability >= 0.5) probScore = 15;
  else if (vision.oralCancerLikeProbability >= 0.3) probScore = 8;
  if (probScore > 0) {
    drivers.push({
      label: `Vision risk probability ${(vision.oralCancerLikeProbability * 100).toFixed(0)}%`,
      weight: probScore,
    });
  }

  // Questionnaire contribution.
  if (q.betelQuid)
    drivers.push({ label: "Betel quid / areca nut use", weight: 20 });
  if (q.tobacco) drivers.push({ label: "Tobacco use", weight: 15 });
  if (q.alcohol) drivers.push({ label: "Alcohol use", weight: 10 });
  if (q.familyHistory)
    drivers.push({ label: "Family history of oral cancer", weight: 10 });
  if (q.lesionDurationWeeks > 2)
    drivers.push({
      label: `Lesion present > 2 weeks (${q.lesionDurationWeeks}w)`,
      weight: 15,
    });
  if (q.bleeding) drivers.push({ label: "Bleeding reported", weight: 10 });
  if (q.ulcer) drivers.push({ label: "Ulcer present", weight: 10 });
  if (q.pain) drivers.push({ label: "Pain reported", weight: 5 });
  if (q.age > 45) drivers.push({ label: `Age > 45 (${q.age})`, weight: 8 });

  let total = drivers.reduce((sum, d) => sum + d.weight, 0);

  // Image quality safeguards: poor quality should not falsely inflate certainty.
  const qualityNote: string[] = [];
  if (vision.imageQuality === "poor" || toothbrush.imageQualityScore < 0.5) {
    // Cap the score so we never return "High" purely from a blurry image.
    const cap = 55;
    if (total > cap) {
      qualityNote.push(
        `Score capped at ${cap} because image quality is poor — rescan is recommended before drawing conclusions.`
      );
      total = cap;
    } else {
      qualityNote.push(
        "Image quality is poor — interpret findings with caution and consider rescanning."
      );
    }
  } else if (
    vision.imageQuality === "moderate" ||
    toothbrush.imageQualityScore < 0.7
  ) {
    qualityNote.push(
      "Image quality is moderate — findings should be interpreted with caution."
    );
  }

  const score = clamp(total);
  const riskLevel = categorizeRisk(score);

  // Top drivers for the UI: 5 highest-weight contributors.
  const topRiskDrivers = drivers
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((d) => `${d.label} (+${d.weight})`);

  const confidenceLevel = confidenceLevelFromNumeric(
    vision.confidence,
    toothbrush.imageQualityScore
  );

  const explanationLines: string[] = [];
  explanationLines.push(`Final score: ${score}/100 → ${riskLevel} risk band.`);
  if (drivers.length > 0) {
    explanationLines.push(
      `Top contributing factors: ${topRiskDrivers.join("; ")}.`
    );
  } else {
    explanationLines.push(
      "No significant risk drivers were detected from the inputs."
    );
  }
  explanationLines.push(...qualityNote);
  explanationLines.push(
    "Risk bands: 0–29 Low, 30–59 Medium, 60–100 High. This is prototype triage, not a diagnosis."
  );

  return {
    score,
    riskLevel,
    topRiskDrivers,
    confidenceLevel,
    scoringExplanation: explanationLines.join(" "),
  };
}
