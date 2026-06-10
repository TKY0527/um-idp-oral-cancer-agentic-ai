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
  /** Days since the patient's last professional scaling (from their record). */
  lastScalingDaysAgo?: number;
}

/**
 * Dental Wellness Agent — "function 2" on the same picture.
 *
 * Combines the tooth-health cues the vision model read DIRECTLY from the
 * image (vision.dentalSigns — cavity signs, gum redness, plaque, staining)
 * with smart-toothbrush telemetry and the questionnaire. When no LLM ran
 * (mock without image cues) it degrades to the original deterministic
 * rule-based estimate, so the output is always present and reproducible.
 * Educational only.
 */
export async function runDentalWellnessAgent(
  input: DentalWellnessInput
): Promise<DentalWellness> {
  const { vision, questionnaire: q, toothbrush } = input;
  const signs = vision.dentalSigns;

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
  // Image evidence adjusts the score: heavy plaque or visible decay in the
  // picture outweighs good telemetry.
  if (signs?.plaqueOrTartar === "heavy") hygiene -= 15;
  else if (signs?.plaqueOrTartar === "moderate") hygiene -= 7;
  if (signs?.cavitySigns === "visible") hygiene -= 10;
  if (signs?.gumRedness === "notable") hygiene -= 8;
  hygiene = Math.max(5, Math.min(100, hygiene));

  // ── Plaque level: prefer what the model saw in the picture ──
  const plaqueLevel: DentalWellness["plaqueLevel"] =
    signs?.plaqueOrTartar ??
    (hygiene >= 75 ? "low" : hygiene >= 50 ? "moderate" : "heavy");

  // ── Staining: image evidence first, then habit proxies ──
  const stainingScore =
    (q.tobacco ? 1 : 0) + (q.betelQuid ? 2 : 0); // betel quid stains heavily
  const habitStaining: DentalWellness["staining"] =
    stainingScore >= 2 ? "notable" : stainingScore === 1 ? "mild" : "none";
  const rank = { none: 0, mild: 1, notable: 2 } as const;
  const staining: DentalWellness["staining"] =
    signs && rank[signs.toothStaining] > rank[habitStaining]
      ? signs.toothStaining
      : habitStaining;

  // ── Gum condition (bleeding is the cardinal sign of gingivitis) ──
  let gumCondition: DentalWellness["gumCondition"] = "healthy";
  if (
    (q.bleeding && (plaqueLevel === "heavy" || q.age >= 45)) ||
    (signs?.gumRedness === "notable" && q.bleeding)
  ) {
    gumCondition = "likely_disease";
  } else if (
    q.bleeding ||
    plaqueLevel !== "low" ||
    vision.visualFinding === "red_patch_like" ||
    (signs && signs.gumRedness !== "none")
  ) {
    gumCondition = "mild_inflammation";
  }

  // ── Cavity risk (蛀牙): image first, then plaque + pain + poor hygiene ──
  let cavityRisk: DentalWellness["cavityRisk"] = "low";
  if (
    signs?.cavitySigns === "visible" ||
    (plaqueLevel === "heavy" && (q.pain || hygiene < 45))
  ) {
    cavityRisk = "likely";
  } else if (
    signs?.cavitySigns === "possible" ||
    plaqueLevel !== "low" ||
    q.pain
  ) {
    cavityRisk = "early_signs";
  }

  // ── 要不要洗牙 — scaling/cleaning recommendation ──
  // Heavy plaque/tartar or notable staining in the picture → go soon;
  // moderate build-up, gum inflammation, or >6 months since the last
  // scaling → routine appointment; otherwise not needed yet.
  const monthsSinceScaling =
    input.lastScalingDaysAgo !== undefined
      ? Math.floor(input.lastScalingDaysAgo / 30)
      : undefined;
  let scalingAdvice: DentalWellness["scalingAdvice"];
  if (plaqueLevel === "heavy" || staining === "notable") {
    scalingAdvice = {
      level: "soon",
      reason:
        plaqueLevel === "heavy"
          ? "Heavy plaque/tartar build-up visible — professional scaling recommended soon."
          : "Notable staining visible — professional cleaning will remove it.",
    };
  } else if (
    plaqueLevel === "moderate" ||
    gumCondition !== "healthy" ||
    (monthsSinceScaling !== undefined && monthsSinceScaling >= 6)
  ) {
    scalingAdvice = {
      level: "routine",
      reason:
        monthsSinceScaling !== undefined && monthsSinceScaling >= 6
          ? `Last scaling was about ${monthsSinceScaling} months ago — a routine cleaning is due (every 6 months is recommended).`
          : "Some plaque or gum irritation — book a routine cleaning.",
    };
  } else {
    scalingAdvice = {
      level: "not_needed",
      reason:
        monthsSinceScaling !== undefined
          ? `Teeth look clean and the last scaling was about ${monthsSinceScaling} month(s) ago — no cleaning needed yet.`
          : "Teeth look clean — keep up the routine and re-check at your next visit.",
    };
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
    `Plaque level: ${plaqueLevel}.` +
    (signs ? " Based on tooth-health cues read from the same picture." : "");

  return {
    cavityRisk,
    gumCondition,
    plaqueLevel,
    staining,
    hygieneScore: hygiene,
    summary,
    suggestions: suggestions.slice(0, 5),
    disclaimer: DENTAL_DISCLAIMER,
    imageObservations: signs?.notes || undefined,
    scalingAdvice,
  };
}
