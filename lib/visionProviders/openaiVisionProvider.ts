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

const OPENAI_MODEL = () => process.env.OPENAI_MODEL ?? "gpt-4o";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

/** Reasoning models (o1/o3/…, gpt-5*) reject non-default temperature. */
export function openaiSupportsTemperature(model: string): boolean {
  return !/^(o\d|gpt-5)/.test(model);
}

/**
 * ChatGPT (OpenAI) Vision provider.
 *
 * Same contract as the Gemini/Claude providers: one image in, a combined
 * oral-cancer + tooth-health JSON out. The API key comes from the request
 * (demo BYOK paste) or falls back to OPENAI_API_KEY on the backend.
 */
export const openaiVisionProvider: VisionProvider = {
  id: "openai",
  label: "ChatGPT Vision",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    const apiKey = input.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set and no key was pasted");
    }
    if (!input.imageBase64) {
      throw new Error("No image data provided to ChatGPT Vision provider");
    }

    const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS ?? "30000", 10);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const model = OPENAI_MODEL();
      const body: Record<string, unknown> = {
        model,
        // max_completion_tokens replaces the deprecated max_tokens and is
        // required by the o*/gpt-5* reasoning models.
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: DUAL_FUNCTION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.imageMimeType ?? "image/jpeg"};base64,${input.imageBase64}`,
                },
              },
            ],
          },
        ],
      };
      if (openaiSupportsTemperature(model)) {
        body.temperature = 0.2;
      }

      const res = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          `OpenAI API error ${res.status}: ${errText.slice(0, 300)}`
        );
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(text, "ChatGPT");
      return coerceVisionResult(parsed, "ChatGPT Vision");
    } finally {
      clearTimeout(timer);
    }
  },
};
