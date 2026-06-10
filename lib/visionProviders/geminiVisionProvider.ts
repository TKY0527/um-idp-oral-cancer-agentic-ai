import type { VisionResult } from "@/lib/types/screening";
import type {
  VisionProvider,
  VisionProviderInput,
} from "@/lib/visionProviders/mockVisionProvider";
import {
  DUAL_FUNCTION_PROMPT,
  coerceVisionResult,
  extractJson,
} from "@/lib/visionProviders/shared";

const GEMINI_MODEL = () => process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
// Key goes in the x-goog-api-key header, NOT the URL — keys in URLs leak
// into error messages and proxy logs (matters extra for user-pasted keys).
const GEMINI_ENDPOINT = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`;

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
    dentalSigns: {
      type: "object",
      properties: {
        cavitySigns: { type: "string", enum: ["none", "possible", "visible"] },
        gumRedness: { type: "string", enum: ["none", "mild", "notable"] },
        plaqueOrTartar: {
          type: "string",
          enum: ["low", "moderate", "heavy"],
        },
        toothStaining: { type: "string", enum: ["none", "mild", "notable"] },
        notes: { type: "string" },
      },
      required: [
        "cavitySigns",
        "gumRedness",
        "plaqueOrTartar",
        "toothStaining",
        "notes",
      ],
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
    "dentalSigns",
    "disclaimer",
  ],
} as const;

export const geminiVisionProvider: VisionProvider = {
  id: "gemini",
  label: "Gemini Vision",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set and no key was pasted");
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
              { text: DUAL_FUNCTION_PROMPT },
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

      const res = await fetch(GEMINI_ENDPOINT(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
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
      const parsed = extractJson(text, "Gemini");
      return coerceVisionResult(parsed, "Gemini Vision");
    } finally {
      clearTimeout(timer);
    }
  },
};
