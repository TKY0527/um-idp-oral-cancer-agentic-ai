import type {
  DentalSigns,
  DetectionBox,
  VisionResult,
} from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";

/**
 * Shared prompt + JSON coercion for the LLM vision providers (Gemini,
 * Claude, ChatGPT/OpenAI).
 *
 * ONE image → TWO functions in a single call:
 *   1. Oral-cancer screening cues (visualFinding, probability, region)
 *   2. Everyday tooth-health cues (cavity signs, gum redness, plaque, staining)
 *
 * Keeping the prompt and coercion in one module guarantees the three
 * providers stay interchangeable: pick any of them (or paste your own API
 * key in the demo) and the rest of the agent pipeline behaves identically.
 */

export const DUAL_FUNCTION_PROMPT = `You are assisting with an educational oral health screening prototype. Analyze the oral cavity image and perform TWO functions on the SAME picture. Do not give a medical diagnosis. Do not claim certainty.

FUNCTION 1 — Oral cancer screening cues:
Identify whether the image appears to show normal tissue, ulcer-like appearance, white patch-like area, red patch-like area, mixed white/red patch-like area, or unclear image quality. Estimate an oral-cancer-like visual risk probability from 0 to 1 for prototype triage only.

FUNCTION 2 — Tooth health cues:
From the same image, estimate everyday dental health: visible cavity/decay signs, gum redness/inflammation, plaque or tartar build-up, and tooth staining.

Return ONLY a single JSON object (no markdown fences, no extra text) with these fields:
- visualFinding: one of "normal" | "ulcer_like" | "white_patch_like" | "red_patch_like" | "mixed_white_red_patch_like" | "unclear"
- suspectedRegion: one of "none" | "tongue" | "lateral tongue" | "inner cheek" | "floor of mouth" | "gum" | "palate" | "unknown"
- oralCancerLikeProbability: number 0..1
- confidence: number 0..1
- imageQuality: one of "good" | "moderate" | "poor"
- observationSummary: 1-2 sentence plain-English description of what is visible
- reasoning: 1-3 sentences explaining how you reached the visualFinding
- detections: array (can be empty) of { x, y, w, h, label, score } bounding boxes, x/y/w/h normalized 0..1 of the image, label one of the visualFinding values
- dentalSigns: {
    cavitySigns: "none" | "possible" | "visible",
    gumRedness: "none" | "mild" | "notable",
    plaqueOrTartar: "low" | "moderate" | "heavy",
    toothStaining: "none" | "mild" | "notable",
    notes: "1-2 sentences about tooth health visible in the picture"
  }
- disclaimer: must say this is not a diagnosis and a dentist or doctor should be consulted`;

const ALLOWED_FINDINGS = new Set([
  "normal",
  "ulcer_like",
  "white_patch_like",
  "red_patch_like",
  "mixed_white_red_patch_like",
  "unclear",
]);

const ALLOWED_REGIONS = new Set([
  "none",
  "tongue",
  "lateral tongue",
  "inner cheek",
  "floor of mouth",
  "gum",
  "palate",
  "unknown",
]);

const ALLOWED_QUALITY = new Set(["good", "moderate", "poor"]);

export function extractJson(text: string, providerLabel: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`No JSON object found in ${providerLabel} response`);
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

export function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function pick<T extends string>(
  raw: unknown,
  allowed: Set<string>,
  fallback: T
): T {
  const s = String(raw ?? "");
  return (allowed.has(s) ? s : fallback) as T;
}

export function coerceDetections(raw: unknown): DetectionBox[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      return {
        x: clamp01(o.x, 0),
        y: clamp01(o.y, 0),
        w: clamp01(o.w, 0),
        h: clamp01(o.h, 0),
        label: typeof o.label === "string" ? o.label : "region",
        score: clamp01(o.score, 0.5),
      } satisfies DetectionBox;
    })
    .filter((b): b is DetectionBox => b !== null && b.w > 0 && b.h > 0)
    .slice(0, 5);
}

export function coerceDentalSigns(raw: unknown): DentalSigns | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    cavitySigns: pick(o.cavitySigns, new Set(["none", "possible", "visible"]), "none"),
    gumRedness: pick(o.gumRedness, new Set(["none", "mild", "notable"]), "none"),
    plaqueOrTartar: pick(o.plaqueOrTartar, new Set(["low", "moderate", "heavy"]), "low"),
    toothStaining: pick(o.toothStaining, new Set(["none", "mild", "notable"]), "none"),
    notes: typeof o.notes === "string" ? o.notes : "",
  };
}

export function coerceVisionResult(
  raw: unknown,
  providerLabel: string
): VisionResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    visualFinding: pick(r.visualFinding, ALLOWED_FINDINGS, "unclear"),
    suspectedRegion: pick(r.suspectedRegion, ALLOWED_REGIONS, "unknown"),
    oralCancerLikeProbability: clamp01(r.oralCancerLikeProbability, 0.2),
    confidence: clamp01(r.confidence, 0.5),
    imageQuality: pick(r.imageQuality, ALLOWED_QUALITY, "moderate"),
    observationSummary: String(
      r.observationSummary ??
        `${providerLabel} analysis returned without an explicit summary.`
    ),
    disclaimer: String(r.disclaimer ?? SCREENING_DISCLAIMER),
    detections: coerceDetections(r.detections),
    reasoning: typeof r.reasoning === "string" ? r.reasoning : undefined,
    dentalSigns: coerceDentalSigns(r.dentalSigns),
  };
}
