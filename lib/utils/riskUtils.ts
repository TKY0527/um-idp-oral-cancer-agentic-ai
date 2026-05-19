import type {
  ConfidenceLevel,
  RiskLevel,
  VisualFinding,
} from "@/lib/types/screening";

export const SCREENING_DISCLAIMER =
  "This prototype is not a medical diagnosis. It is an educational oral cancer screening demonstration. Please consult a qualified dentist or doctor for proper diagnosis.";

/**
 * Visual-finding weights — calibrated from published malignant transformation
 * rates of oral potentially malignant disorders (OPMDs):
 *
 *   • normal          → 0    (no lesion observed)
 *   • unclear         → 5    (mainly an image-quality flag, not a real risk
 *                              signal — keep low so blurry frames don't drive
 *                              risk up)
 *   • ulcer_like      → 12   (most ulcers are benign; concern only when
 *                              persistent — duration is weighted separately
 *                              per NCCN H&N referral threshold of 2 weeks)
 *   • white_patch_like → 20  (leukoplakia: malignant transformation
 *                              ≈ 3–17 % depending on dysplasia grade.
 *                              Reichart & Philipsen 2005; Speight 2007)
 *   • red_patch_like   → 32  (erythroplakia: transformation ≈ 14–50 %,
 *                              substantially higher than leukoplakia.
 *                              van der Waal 2014)
 *   • mixed_white_red_patch_like → 38
 *                              (erythroleukoplakia: highest transformation
 *                              rate among OPMDs; high-grade dysplasia in
 *                              majority of biopsies. van der Waal 2014)
 */
export const VISUAL_FINDING_SCORES: Record<VisualFinding, number> = {
  normal: 0,
  unclear: 5,
  ulcer_like: 12,
  white_patch_like: 20,
  red_patch_like: 32,
  mixed_white_red_patch_like: 38,
};

export const VISUAL_FINDING_LABEL: Record<VisualFinding, string> = {
  normal: "Normal-looking tissue",
  unclear: "Unclear / image quality limited",
  ulcer_like: "Ulcer-like appearance",
  white_patch_like: "White patch-like area",
  red_patch_like: "Red patch-like area",
  mixed_white_red_patch_like: "Mixed white/red patch-like area",
};

export function categorizeRisk(score: number): RiskLevel {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 60) return "High";
  if (clamped >= 30) return "Medium";
  return "Low";
}

export function clamp(score: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, score));
}

export function confidenceLevelFromNumeric(
  visionConfidence: number,
  imageQualityScore: number
): ConfidenceLevel {
  const blended = visionConfidence * 0.6 + imageQualityScore * 0.4;
  if (blended >= 0.75) return "High";
  if (blended >= 0.5) return "Moderate";
  return "Low";
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function newSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `OCS-${ts}-${rand}`.toUpperCase();
}

export function riskLevelColorClass(level: RiskLevel): string {
  switch (level) {
    case "Low":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "Medium":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "High":
      return "text-red-700 bg-red-50 border-red-200";
  }
}

export function riskLevelDotClass(level: RiskLevel): string {
  switch (level) {
    case "Low":
      return "bg-emerald-500";
    case "Medium":
      return "bg-amber-500";
    case "High":
      return "bg-red-500";
  }
}

export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function summarizeQuestionnaire(q: {
  age: number;
  tobacco: boolean;
  alcohol: boolean;
  betelQuid: boolean;
  familyHistory: boolean;
  lesionDurationWeeks: number;
  pain: boolean;
  bleeding: boolean;
  ulcer: boolean;
}): string {
  const parts: string[] = [`age ${q.age}`];
  if (q.tobacco) parts.push("tobacco use");
  if (q.alcohol) parts.push("alcohol use");
  if (q.betelQuid) parts.push("betel quid / areca nut use");
  if (q.familyHistory) parts.push("family history of oral cancer");
  if (q.lesionDurationWeeks > 0)
    parts.push(`lesion ${q.lesionDurationWeeks} week(s)`);
  if (q.pain) parts.push("pain");
  if (q.bleeding) parts.push("bleeding");
  if (q.ulcer) parts.push("ulcer present");
  return parts.join(", ");
}
