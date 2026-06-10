/**
 * Shared text-only OpenAI (ChatGPT) call — mirrors the Gemini/Claude expert
 * helpers' contract so the chat agent and doctor assistant can use any of
 * the three providers interchangeably (env key or demo BYOK pasted key).
 *
 * Throws on hard failure — the caller is responsible for the fallback.
 */

const DEFAULT_MODEL = () => process.env.OPENAI_MODEL ?? "gpt-4o";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface OpenAICallOptions {
  systemPrompt: string;
  userPayload: string;
  temperature?: number;
  timeoutMs?: number;
  /** Override the model used for this call. */
  model?: string;
  /** Demo BYOK: user-pasted key — takes priority over OPENAI_API_KEY. */
  apiKey?: string;
  /** When true, ask for plain text instead of a JSON object. */
  plainText?: boolean;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const a = candidate.indexOf("{");
  const b = candidate.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) {
    throw new Error("No JSON object found in OpenAI response");
  }
  return JSON.parse(candidate.slice(a, b + 1));
}

async function callOpenAIRaw(opts: OpenAICallOptions): Promise<string> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const timeoutMs =
    opts.timeoutMs ??
    parseInt(process.env.VISION_API_TIMEOUT_MS ?? "30000", 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const model = opts.model ?? DEFAULT_MODEL();
    const body: Record<string, unknown> = {
      model,
      // max_completion_tokens replaces the deprecated max_tokens and is
      // required by the o*/gpt-5* reasoning models.
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPayload },
      ],
    };
    // Reasoning models (o1/o3/…, gpt-5*) reject non-default temperature.
    if (!/^(o\d|gpt-5)/.test(model)) {
      body.temperature = opts.temperature ?? 0.3;
    }
    if (!opts.plainText) {
      body.response_format = { type: "json_object" };
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
      const t = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Empty response from OpenAI");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function callOpenAIExpert<T>(opts: OpenAICallOptions): Promise<T> {
  const text = await callOpenAIRaw({ ...opts, plainText: false });
  return extractJson(text) as T;
}

export async function callOpenAIText(opts: OpenAICallOptions): Promise<string> {
  return callOpenAIRaw({ ...opts, plainText: true });
}
