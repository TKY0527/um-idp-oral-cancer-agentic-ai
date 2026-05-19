import type { DetectionBox, VisionResult } from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";
import type {
  VisionProvider,
  VisionProviderInput,
} from "@/lib/visionProviders/mockVisionProvider";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_ENDPOINT = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

const SYSTEM_PROMPT = `You are assisting with an educational oral cancer screening prototype. Analyze the oral cavity image for visible screening cues only. Do not give a medical diagnosis. Do not claim certainty.

Return a single JSON object with these fields:
- visualFinding: one of "normal", "ulcer_like", "white_patch_like", "red_patch_like", "mixed_white_red_patch_like", "unclear"
- suspectedRegion: one of "none", "tongue", "lateral tongue", "inner cheek", "floor of mouth", "gum", "palate", "unknown"
- oralCancerLikeProbability: number between 0 and 1 (prototype triage only)
- confidence: number between 0 and 1
- imageQuality: one of "good", "moderate", "poor"
- observationSummary: 1–2 sentence plain-English description
- reasoning: 1–3 sentences explaining how you reached the visualFinding (chain-of-thought visible to the patient)
- detections: array of bounding boxes (can be empty). Each item: { x, y, w, h, label, score } where x,y,w,h are normalized to 0..1 of the image and label is one of the visualFinding values
- disclaimer: must literally say "This prototype is not a medical diagnosis. It is an educational oral cancer screening demonstration. Please consult a qualified dentist or doctor for proper diagnosis."

Respond with ONLY the JSON object, no markdown fences, no extra text.`;

// JSON schema enforced by Gemini's structured-output feature.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    visualFinding: {
      type: "string",
      enum: [
        "normal",
        "ulcer_like",
        "white_patch_like",
        "red_patch_like",
        "mixed_white_red_patch_like",
        "unclear",
      ],
    },
    suspectedRegion: {
      type: "string",
      enum: [
        "none",
        "tongue",
        "lateral tongue",
        "inner cheek",
        "floor of mouth",
        "gum",
        "palate",
        "unknown",
      ],
    },
    oralCancerLikeProbability: { type: "number" },
    confidence: { type: "number" },
    imageQuality: { type: "string", enum: ["good", "moderate", "poor"] },
    observationSummary: { type: "string" },
    reasoning: { type: "string" },
    detections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
          label: { type: "string" },
          score: { type: "number" },
        },
        required: ["x", "y", "w", "h", "label", "score"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: [
    "visualFinding",
    "suspectedRegion",
    "oralCancerLikeProbability",
    "confidence",
    "imageQuality",
    "observationSummary",
    "disclaimer",
  ],
} as const;

function extractJson(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object found in Gemini response");
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function coerceDetections(raw: unknown): DetectionBox[] | undefined {
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

function coerceVisionResult(raw: unknown): VisionResult {
  const r = (raw ?? {}) as Record<string, unknown>;
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
    visualFinding: (allowedFindings.has(finding)
      ? finding
      : "unclear") as VisionResult["visualFinding"],
    suspectedRegion: (allowedRegions.has(region)
      ? region
      : "unknown") as VisionResult["suspectedRegion"],
    oralCancerLikeProbability: clamp01(r.oralCancerLikeProbability, 0.2),
    confidence: clamp01(r.confidence, 0.5),
    imageQuality: (allowedQuality.has(quality)
      ? quality
      : "moderate") as VisionResult["imageQuality"],
    observationSummary: String(
      r.observationSummary ?? "Gemini Vision analysis returned without an explicit summary."
    ),
    disclaimer: String(r.disclaimer ?? SCREENING_DISCLAIMER),
    detections: coerceDetections(r.detections),
    reasoning: typeof r.reasoning === "string" ? r.reasoning : undefined,
  };
}

export const geminiVisionProvider: VisionProvider = {
  id: "gemini",
  label: "Gemini Vision",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    if (!input.imageBase64) {
      throw new Error("No image data provided to Gemini Vision provider");
    }

    const timeoutMs = parseInt(
      process.env.VISION_API_TIMEOUT_MS ?? "30000",
      10
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = {
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: input.imageMimeType ?? "image/jpeg",
                  data: input.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      };

      const res = await fetch(GEMINI_ENDPOINT(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          `Gemini API error ${res.status}: ${errText.slice(0, 300)}`
        );
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text =
        json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("") ?? "";
      const parsed = extractJson(text);
      return coerceVisionResult(parsed);
    } finally {
      clearTimeout(timer);
    }
  },
};
