import type { VisionResult } from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";
import type {
  VisionProvider,
  VisionProviderInput,
} from "@/lib/visionProviders/mockVisionProvider";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5";
const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";

const PROMPT_TEXT = `You are assisting with an educational oral cancer screening prototype. Analyze the oral cavity image for visible screening cues only. Do not give a medical diagnosis. Do not claim certainty. Identify whether the image appears to show normal tissue, ulcer-like appearance, white patch-like area, red patch-like area, mixed white/red patch-like area, or unclear image quality. Estimate an oral-cancer-like visual risk probability from 0 to 1 for prototype triage only. Return JSON only with fields: visualFinding, suspectedRegion, oralCancerLikeProbability, confidence, imageQuality, observationSummary, disclaimer. The disclaimer must say this is not a diagnosis and a dentist or doctor should be consulted.

Allowed values:
- visualFinding: "normal" | "ulcer_like" | "white_patch_like" | "red_patch_like" | "mixed_white_red_patch_like" | "unclear"
- suspectedRegion: "none" | "tongue" | "lateral tongue" | "inner cheek" | "floor of mouth" | "gum" | "palate" | "unknown"
- oralCancerLikeProbability: number between 0 and 1
- confidence: number between 0 and 1
- imageQuality: "good" | "moderate" | "poor"

Respond with ONLY a single JSON object, no markdown fences, no extra text.`;

function extractJson(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object found in Claude response");
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function coerceVisionResult(raw: unknown): VisionResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
  };
  const allowedFindings = new Set([
    "normal",
    "ulcer_like",
    "white_patch_like",
    "red_patch_like",
    "mixed_white_red_patch_like",
    "unclear",
  ]);
  const allowedRegions = new Set([
    "none",
    "tongue",
    "lateral tongue",
    "inner cheek",
    "floor of mouth",
    "gum",
    "palate",
    "unknown",
  ]);
  const allowedQuality = new Set(["good", "moderate", "poor"]);
  const finding = String(r.visualFinding ?? "unclear");
  const region = String(r.suspectedRegion ?? "unknown");
  const quality = String(r.imageQuality ?? "moderate");

  return {
    visualFinding: (allowedFindings.has(finding) ? finding : "unclear") as VisionResult["visualFinding"],
    suspectedRegion: (allowedRegions.has(region) ? region : "unknown") as VisionResult["suspectedRegion"],
    oralCancerLikeProbability: num(r.oralCancerLikeProbability, 0.2),
    confidence: num(r.confidence, 0.5),
    imageQuality: (allowedQuality.has(quality) ? quality : "moderate") as VisionResult["imageQuality"],
    observationSummary: String(
      r.observationSummary ?? "Claude Vision analysis returned without an explicit summary."
    ),
    disclaimer: String(r.disclaimer ?? SCREENING_DISCLAIMER),
  };
}

export const claudeVisionProvider: VisionProvider = {
  id: "claude",
  label: "Claude Vision",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    if (!input.imageBase64) {
      throw new Error("No image data provided to Claude Vision provider");
    }

    const timeoutMs = parseInt(
      process.env.VISION_API_TIMEOUT_MS ?? "30000",
      10
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = {
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: input.imageMimeType ?? "image/jpeg",
                  data: input.imageBase64,
                },
              },
              { type: "text", text: PROMPT_TEXT },
            ],
          },
        ],
      };

      const res = await fetch(CLAUDE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 300)}`);
      }

      const json = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text =
        json.content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join("") ?? "";
      const parsed = extractJson(text);
      return coerceVisionResult(parsed);
    } finally {
      clearTimeout(timer);
    }
  },
};
