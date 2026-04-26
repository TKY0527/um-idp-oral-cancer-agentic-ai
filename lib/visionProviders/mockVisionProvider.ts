import type { VisionResult } from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";

export interface VisionProviderInput {
  imageBase64?: string;
  imageMimeType?: string;
  // For sample cases the orchestrator passes a preset directly through analyze().
  preset?: VisionResult;
}

export interface VisionProvider {
  id: "mock" | "gemini" | "claude" | "local";
  label: string;
  analyze(input: VisionProviderInput): Promise<VisionResult>;
}

export const MOCK_DEFAULT_OUTPUT: VisionResult = {
  visualFinding: "unclear",
  suspectedRegion: "unknown",
  oralCancerLikeProbability: 0.22,
  confidence: 0.55,
  imageQuality: "moderate",
  observationSummary:
    "Mock provider produced a synthetic screening result. No real model was called.",
  disclaimer: SCREENING_DISCLAIMER,
};

// Lightweight deterministic hash so the same upload yields the same mock output.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const mockVisionProvider: VisionProvider = {
  id: "mock",
  label: "Mock (offline)",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    // Generate a plausible-looking mock result derived from image bytes (or none).
    const seed = input.imageBase64 ? hashString(input.imageBase64.slice(0, 256)) : 0;
    const findings: VisionResult["visualFinding"][] = [
      "normal",
      "unclear",
      "ulcer_like",
      "white_patch_like",
      "red_patch_like",
    ];
    const regions: VisionResult["suspectedRegion"][] = [
      "none",
      "tongue",
      "lateral tongue",
      "inner cheek",
      "floor of mouth",
      "gum",
    ];
    const finding = findings[seed % findings.length];
    const region =
      finding === "normal" ? "none" : regions[(seed >> 3) % regions.length];
    const probability =
      finding === "normal"
        ? 0.05 + (seed % 10) / 100
        : 0.2 + ((seed >> 5) % 60) / 100;

    return {
      visualFinding: finding,
      suspectedRegion: region,
      oralCancerLikeProbability: Math.min(0.95, probability),
      confidence: 0.6 + ((seed >> 7) % 30) / 100,
      imageQuality: "moderate",
      observationSummary: `Mock analysis: image deterministically classified as ${finding} for prototype demo only.`,
      disclaimer: SCREENING_DISCLAIMER,
    };
  },
};
