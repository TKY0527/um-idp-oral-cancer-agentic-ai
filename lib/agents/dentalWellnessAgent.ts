import type {
  DentalWellness,
  Questionnaire,
  ToothbrushTelemetry,
  VisionResult,
} from "@/lib/types/screening";

export const DENTAL_DISCLAIMER =
  "This is an educational oral-health estimate, not a dental diagnosis. See a dentist for cavities, gum problems, or a professional cleaning.";

export interface DentalWellnessInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
  toothbrush: ToothbrushTelemetry;
}

/**
 * Dental Wellness Agent
 *
 * A deterministic, educational multi-condition assessment that runs ALONGSIDE
 * the oral-cancer pipeline. It estimates everyday dental concerns — cavities
 * (蛀牙), gum health, plaque, staining, and an overall hygiene score — from the
 * smart-toothbrush telemetry, the questionnaire, and visual cues.
 *
 * It is intentionally rule-based (no LLM) so the output is reproducible and
 * cannot drift. Educational only.
 */
export async function runDentalWellnessAgent(
  input: DentalWellnessInput
): Promise<DentalWellness> {
  const { vision, questionnaire: q, toothbrush } = input;

  // ── Hygiene score (0–100): starts from brushing telemetry quality ──
  // Coverage + image quality are good proxies for how well the mouth is
  // being cleaned/captured; high pressure and very short brushing hurt.
  let hygiene = Math.round(
    toothbrush.coveragePercent * 0.5 + toothbrush.imageQualityScore * 100 * 0.3
  );
  if (toothbrush.brushingDurationSec >= 120) hygiene += 12; // dentist-recommended 2 min
  else if (toothbrush.brushingDurationSec >= 90) hygiene += 6;
  if (toothbrush.pressureLevel === "high") hygiene -= 8; // brushing too hard
  if (q.bleeding) hygiene -= 10;
  if (q.ulcer) hygiene -= 4;
  hygiene = Math.max(5, Math.min(100, hygiene));

  // ── Plaque level (inverse of hygiene, nudged by staining cues) ──
  const plaqueLevel: DentalWellness["plaqueLevel"] =
    hygiene >= 75 ? "low" : hygiene >= 50 ? "moderate" : "heavy";

  // ── Staining (smoking/betel/tea-coffee proxies + image) ──
  const stainingScore =
    (q.tobacco ? 1 : 0) + (q.betelQuid ? 2 : 0); // betel quid stains heavily
  const staining: DentalWellness["staining"] =
    stainingScore >= 2 ? "notable" : stainingScore === 1 ? "mild" : "none";

  // ── Gum condition (bleeding is the cardinal sign of gingivitis) ──
  let gumCondition: DentalWellness["gumCondition"] = "healthy";
  if (q.bleeding && (plaqueLevel === "heavy" || q.age >= 45)) {
    gumCondition = "likely_disease";
  } else if (q.bleeding || plaqueLevel !== "low" || vision.visualFinding === "red_patch_like") {
    gumCondition = "mild_inflammation";
  }

  // ── Cavity risk (蛀牙): plaque + pain + poor hygiene ──
  let cavityRisk: DentalWellness["cavityRisk"] = "low";
  if (plaqueLevel === "heavy" && (q.pain || hygiene < 45)) {
    cavityRisk = "likely";
  } else if (plaqueLevel !== "low" || q.pain) {
    cavityRisk = "early_signs";
  }

  // ── Patient-friendly summary + suggestions ──
  const suggestions: string[] = [];
  if (toothbrush.brushingDurationSec < 120)
    suggestions.push("Brush for the full 2 minutes, twice a day.");
  if (toothbrush.pressureLevel === "high")
    suggestions.push("Ease off the pressure — hard brushing harms gums and enamel.");
  if (toothbrush.coveragePercent < 80)
    suggestions.push("Reach all areas — back teeth and gum line are often missed.");
  if (gumCondition !== "healthy")
    suggestions.push("Floss daily; bleeding gums often improve within 1–2 weeks.");
  if (cavityRisk !== "low")
    suggestions.push("Cut down sugary snacks/drinks and book a dental check-up.");
  if (staining !== "none")
    suggestions.push("Tobacco/betel staining is reversible with professional cleaning.");
  if (suggestions.length === 0)
    suggestions.push("Great habits — keep brushing 2 minutes twice daily and floss.");

  const summary =
    `Estimated oral-hygiene score ${hygiene}/100. ` +
    `Cavity (tooth decay) risk: ${cavityRisk.replace("_", " ")}. ` +
    `Gum condition: ${gumCondition.replace("_", " ")}. ` +
    `Plaque level: ${plaqueLevel}.`;

  return {
    cavityRisk,
    gumCondition,
    plaqueLevel,
    staining,
    hygieneScore: hygiene,
    summary,
    suggestions: suggestions.slice(0, 5),
    disclaimer: DENTAL_DISCLAIMER,
  };
}
