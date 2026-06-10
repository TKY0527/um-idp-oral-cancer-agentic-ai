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

const CLAUDE_MODEL = () => process.env.CLAUDE_MODEL ?? "claude-opus-4-7";
const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";

export const claudeVisionProvider: VisionProvider = {
  id: "claude",
  label: "Claude Vision",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    const apiKey = input.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set and no key was pasted");
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
        model: CLAUDE_MODEL(),
        max_tokens: 1024,
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
              { type: "text", text: DUAL_FUNCTION_PROMPT },
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
      const parsed = extractJson(text, "Claude");
      return coerceVisionResult(parsed, "Claude Vision");
    } finally {
      clearTimeout(timer);
    }
  },
};
