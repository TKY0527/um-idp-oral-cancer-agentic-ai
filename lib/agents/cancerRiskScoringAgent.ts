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
  source?: string;
}

/**
 * Cancer Risk Scoring Agent
 *
 * Combines the vision finding, the patient questionnaire, and the toothbrush
 * session quality into a 0–100 oral-cancer-like risk score with categorical
 * Low / Medium / High and a transparent breakdown of the top drivers.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WEIGHT CALIBRATION SOURCES (educational paraphrase only — NOT clinical
 *  guidelines). All odds-ratio ranges below are taken from established
 *  epidemiological literature; the absolute weights are scaled to a 0–100
 *  prototype band, not real risk probabilities.
 *
 *   • IARC Monograph Vol 85 (2004) — betel quid as Group 1 carcinogen,
 *     pooled OR ≈ 7–20× in chewers; combined with tobacco the OR is even
 *     higher (cited as the largest modifiable risk factor in South /
 *     South-East Asia, which matches the IDP's geographic context).
 *
 *   • IARC Monograph Vol 100E (2012) — tobacco smoke and alcohol; both
 *     classified Group 1 for oral cavity.
 *
 *   • INHANCE consortium pooled analysis (Hashibe et al. 2007, 2009) —
 *     alcohol × tobacco is supra-additive, combined OR up to ≈ 35× in
 *     heavy users. We model this as an explicit "synergy" bonus rather
 *     than just adding the individual contributions.
 *
 *   • Warnakulasuriya S, Oral Oncology (2009) — global oral cancer
 *     epidemiology review; risk roughly doubles per decade after 40, so
 *     we use tiered age weights instead of one binary cut-off.
 *
 *   • van der Waal I (2014) — erythroplakia transformation rate
 *     14–50 %, much higher than leukoplakia (3–17 %); mixed lesions
 *     (erythroleukoplakia) are highest. Reflected in
 *     VISUAL_FINDING_SCORES (see riskUtils.ts).
 *
 *   • NCCN Head and Neck Cancers Guidelines — a mouth lesion that has
 *     not healed in ≥ 2 weeks is the conventional referral threshold;
 *     ≥ 4 weeks is a stronger red flag. Modelled as two-tier lesion
 *     duration weighting.
 *
 *   • Reichart & Philipsen (2005), Speight (2007) — leukoplakia
 *     malignant transformation rates; supports white-patch weighting.
 *
 *   • Petti S (2003) — pooled risk-factor analysis.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Image-quality safeguard: a "poor" image caps the final score so the
 * pipeline never produces a confident High verdict from a blurry frame.
 */
export async function runCancerRiskScoringAgent(
  input: RiskScoringInput
): Promise<RiskScore> {
  const { vision, questionnaire: q, toothbrush } = input;
  const drivers: Driver[] = [];

  // ── Visual finding (see VISUAL_FINDING_SCORES; sourced in riskUtils.ts) ──
  const findingScore = VISUAL_FINDING_SCORES[vision.visualFinding] ?? 0;
  if (findingScore > 0) {
    drivers.push({
      label: `Visual finding: ${VISUAL_FINDING_LABEL[vision.visualFinding]}`,
      weight: findingScore,
      source: "van der Waal 2014; Reichart 2005",
    });
  }

  // ── Vision probability band ──
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

  // ── Questionnaire risk factors (literature-grounded) ──

  // Betel quid / areca nut — largest modifiable factor in our region
  if (q.betelQuid) {
    drivers.push({
      label: "Betel quid / areca nut use",
      weight: 25,
      source: "IARC Monograph 85 (2004)",
    });
  }

  // Tobacco
  if (q.tobacco) {
    drivers.push({
      label: "Tobacco use",
      weight: 18,
      source: "IARC Monograph 100E (2012)",
    });
  }

  // Alcohol
  if (q.alcohol) {
    drivers.push({
      label: "Alcohol use",
      weight: 12,
      source: "IARC Monograph 100E (2012)",
    });
  }

  // Synergies — modelled explicitly because the literature shows the
  // combined risk is supra-additive, not simply the sum of the parts.
  if (q.tobacco && q.alcohol) {
    drivers.push({
      label: "Tobacco × alcohol synergy",
      weight: 8,
      source: "INHANCE pooled analysis (Hashibe 2007, 2009)",
    });
  }
  if (q.tobacco && q.betelQuid) {
    drivers.push({
      label: "Tobacco × betel quid synergy",
      weight: 10,
      source: "IARC Monograph 85 (2004)",
    });
  }

  // Family history
  if (q.familyHistory) {
    drivers.push({
      label: "Family history of oral cancer",
      weight: 10,
      source: "Petti 2003 pooled analysis",
    });
  }

  // Lesion duration tiers — NCCN referral thresholds
  if (q.lesionDurationWeeks > 4) {
    drivers.push({
      label: `Lesion present > 4 weeks (${q.lesionDurationWeeks}w)`,
      weight: 18,
      source: "NCCN H&N Guidelines",
    });
  } else if (q.lesionDurationWeeks >= 2) {
    drivers.push({
      label: `Lesion present 2–4 weeks (${q.lesionDurationWeeks}w)`,
      weight: 12,
      source: "NCCN H&N Guidelines",
    });
  }

  // Bleeding — clinical red flag
  if (q.bleeding) {
    drivers.push({ label: "Bleeding reported", weight: 12 });
  }
  // Ulcer present — lower weight because lesion duration already covers
  // the persistent-ulcer case
  if (q.ulcer) {
    drivers.push({ label: "Ulcer present", weight: 8 });
  }
  // Pain
  if (q.pain) {
    drivers.push({ label: "Pain reported", weight: 5 });
  }

  // Age tiers — risk roughly doubles per decade after 40
  if (q.age >= 65) {
    drivers.push({
      label: `Age ≥ 65 (${q.age})`,
      weight: 14,
      source: "Warnakulasuriya 2009",
    });
  } else if (q.age >= 55) {
    drivers.push({
      label: `Age ≥ 55 (${q.age})`,
      weight: 10,
      source: "Warnakulasuriya 2009",
    });
  } else if (q.age >= 45) {
    drivers.push({
      label: `Age ≥ 45 (${q.age})`,
      weight: 5,
      source: "Warnakulasuriya 2009",
    });
  }

  let total = drivers.reduce((sum, d) => sum + d.weight, 0);

  // ── Image-quality safeguard ──
  const qualityNote: string[] = [];
  if (vision.imageQuality === "poor" || toothbrush.imageQualityScore < 0.5) {
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
    .map((d) =>
      d.source
        ? `${d.label} (+${d.weight}, ${d.source})`
        : `${d.label} (+${d.weight})`
    );

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
    "Weights are calibrated from IARC monographs, the INHANCE consortium, NCCN H&N guidelines and oral-medicine reviews (see lib/agents/cancerRiskScoringAgent.ts). Risk bands: 0–29 Low, 30–59 Medium, 60–100 High. This is prototype triage, not a diagnosis."
  );

  return {
    score,
    riskLevel,
    topRiskDrivers,
    confidenceLevel,
    scoringExplanation: explanationLines.join(" "),
  };
}
