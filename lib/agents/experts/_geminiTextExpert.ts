/**
 * Shared text-only Gemini call used by each role-prompted expert.
 *
 * Why text-only (not vision): the experts read the *output* of the Vision
 * Screening Agent (visualFinding, region, probability, image quality) plus
 * the patient questionnaire — they don't re-analyse the image. This mirrors
 * a real multi-disciplinary tumour board where the radiologist reports, then
 * the pathologist / oncologist / surgeon discuss.
 *
 * Benefits:
 *   - 3 experts in parallel ≈ time of a single LLM call
 *   - Cost ≈ 3 × small text-call (cents), not 3 × image-call
 *   - Falls back to mock cleanly when GEMINI_API_KEY is missing or fails
 */

const DEFAULT_MODEL =
  process.env.GEMINI_EXPERT_MODEL ?? "gemini-3.5-flash";

export interface ExpertCallOptions {
  systemPrompt: string;
  userPayload: string; // the case description as a JSON string
  temperature?: number; // expert-specific personality
  timeoutMs?: number;
}

export interface ExpertCallResult<T> {
  parsed: T;
  fellBack: boolean;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const a = candidate.indexOf("{");
  const b = candidate.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) {
    throw new Error("No JSON object found in expert response");
  }
  return JSON.parse(candidate.slice(a, b + 1));
}

/**
 * Call Gemini with a system+user prompt and ask for JSON back.
 *
 * Returns { parsed, fellBack: false } on success.
 * Throws on hard failure — caller is responsible for the mock fallback.
 */
export async function callGeminiExpert<T>(opts: ExpertCallOptions): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const timeoutMs = opts.timeoutMs ?? parseInt(
    process.env.VISION_API_TIMEOUT_MS ?? "30000",
    10
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `${opts.systemPrompt}\n\nCASE:\n${opts.userPayload}` },
              ],
            },
          ],
          generationConfig: {
            temperature: opts.temperature ?? 0.3,
            responseMimeType: "application/json",
            // gemini-3.5-flash has built-in thinking; the token budget is
            // shared with thinking tokens. 800 is too tight — bump to 4096
            // so even with ~2k thinking tokens we still have headroom for
            // the JSON expert opinion.
            maxOutputTokens: 4096,
          },
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Gemini error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    if (!text) throw new Error("Empty response from Gemini");
    return extractJson(text) as T;
  } finally {
    clearTimeout(timer);
  }
}
