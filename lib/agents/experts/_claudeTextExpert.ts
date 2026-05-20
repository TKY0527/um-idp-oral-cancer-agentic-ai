/**
 * Shared text-only Claude call used by experts that should use Claude rather
 * than Gemini.
 *
 * Mirrors the Gemini helper's contract so each expert agent can pick a
 * provider per role: e.g. the Oral Pathologist uses Claude Opus 4.7 for
 * deep, careful reasoning, while the Epidemiologist and General Dentist
 * use Gemini Flash for speed and parallelism.
 *
 * Falls back to throwing on hard failure — the caller is responsible for
 * the mock fallback.
 */

const DEFAULT_MODEL =
  process.env.EXPERT_PATHOLOGIST_MODEL ??
  process.env.CLAUDE_MODEL ??
  "claude-opus-4-7";

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";

export interface ClaudeCallOptions {
  systemPrompt: string;
  userPayload: string;
  temperature?: number;
  timeoutMs?: number;
  /** Override the model used for this call. */
  model?: string;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const a = candidate.indexOf("{");
  const b = candidate.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) {
    throw new Error("No JSON object found in Claude response");
  }
  return JSON.parse(candidate.slice(a, b + 1));
}

export async function callClaudeExpert<T>(opts: ClaudeCallOptions): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const timeoutMs = opts.timeoutMs ?? parseInt(
    process.env.VISION_API_TIMEOUT_MS ?? "30000",
    10
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const model = opts.model ?? DEFAULT_MODEL;
  // Some newer Claude models (e.g. claude-opus-4-7) have deprecated the
  // `temperature` parameter — sending it returns a 400. Omit it for those.
  const supportsTemperature = !/^claude-opus-4-/.test(model);
  const body: Record<string, unknown> = {
    model,
    max_tokens: 1024,
    system: opts.systemPrompt,
    messages: [
      {
        role: "user",
        content: `CASE:\n${opts.userPayload}\n\nReturn ONLY the JSON object — no preamble.`,
      },
    ],
  };
  if (supportsTemperature) {
    body.temperature = opts.temperature ?? 0.2;
  }

  try {
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
      const t = await res.text().catch(() => "");
      throw new Error(`Claude error ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      json.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("") ?? "";
    if (!text) throw new Error("Empty response from Claude");
    return extractJson(text) as T;
  } finally {
    clearTimeout(timer);
  }
}
