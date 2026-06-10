import type { ChatRole, ProviderKeys, RiskLevel } from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";
import { callOpenAIText } from "@/lib/agents/experts/_openaiTextExpert";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface ChatInput {
  messages: ChatTurn[];
  patientContext?: {
    latestRiskLevel?: RiskLevel;
    latestScore?: number;
    latestFinding?: string;
  };
  /** Demo BYOK: user-pasted keys — take priority over backend env keys. */
  apiKeys?: ProviderKeys;
}

const SYSTEM_INSTRUCTION = `You are the patient-facing AI Health Assistant inside an educational oral cancer screening prototype. Rules you MUST follow:
- You are NOT a doctor. You never confirm or rule out cancer.
- You answer in calm, plain language at a 7th-grade reading level.
- You always append a brief disclaimer when discussing risk or symptoms.
- If asked about emergencies, tell the user to seek in-person care.
- Stay focused on oral health topics. Politely redirect off-topic questions.
- If the user asks for diagnosis, refuse and recommend a dentist.
- Keep answers under 120 words unless the user explicitly asks for more detail.`;

// Chat uses a dedicated, fast Flash model regardless of the heavier model the
// Vision agent might use. Patients won't wait 10s for a chat reply.
const CHAT_MODEL = () => process.env.GEMINI_CHAT_MODEL ?? "gemini-3.5-flash";

function fallbackReply(userText: string, ctx: ChatInput["patientContext"]): string {
  const lower = userText.toLowerCase();
  if (lower.match(/hello|hi|hey/)) {
    return (
      "Hi! I'm the AI Health Assistant for the oral cancer screening prototype. " +
      "I can explain your latest screening result, talk about oral cancer risk factors, " +
      "or guide you to a dentist. What would you like to know?\n\n" +
      SCREENING_DISCLAIMER
    );
  }
  if (lower.includes("ulcer") || lower.includes("sore")) {
    return (
      "Most mouth ulcers heal within 2 weeks. If yours has lasted longer, or it bleeds, " +
      "is painful, or is on the side of your tongue, please book a dentist appointment. " +
      "Don't try to self-diagnose.\n\n" +
      SCREENING_DISCLAIMER
    );
  }
  if (lower.includes("risk") || lower.includes("score")) {
    if (ctx?.latestRiskLevel) {
      return (
        `Your most recent screening was flagged as ${ctx.latestRiskLevel} risk` +
        (ctx.latestScore !== undefined ? ` (score ${ctx.latestScore}/100)` : "") +
        `. This is a prototype score, not a diagnosis. ` +
        (ctx.latestRiskLevel === "High"
          ? "Please book a dentist or oral medicine specialist soon."
          : ctx.latestRiskLevel === "Medium"
            ? "Keep an eye on the area; if it lasts more than 2 weeks, see a dentist."
            : "Continue routine oral hygiene and re-screen periodically.") +
        "\n\n" +
        SCREENING_DISCLAIMER
      );
    }
    return (
      "I can't see a screening result for you yet. Run a screening from the dashboard " +
      "and I'll explain the result here.\n\n" +
      SCREENING_DISCLAIMER
    );
  }
  return (
    "I'm running in offline mock mode right now, so I'll keep this short. " +
    "Could you tell me a bit more about what you'd like to know — for example " +
    "'what does my risk score mean', 'when should I see a dentist', or 'how do I " +
    "self-check at home'?\n\n" +
    SCREENING_DISCLAIMER
  );
}

function buildPromptBlocks(input: ChatInput): { context: string; convo: string } {
  const context = input.patientContext
    ? `Patient context: latestRiskLevel=${input.patientContext.latestRiskLevel ?? "n/a"}, ` +
      `latestScore=${input.patientContext.latestScore ?? "n/a"}, ` +
      `latestFinding=${input.patientContext.latestFinding ?? "n/a"}.`
    : "Patient context: no screening yet.";
  const convo = input.messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  return { context, convo };
}

async function tryGemini(input: ChatInput, apiKey: string): Promise<string> {
  const { context, convo } = buildPromptBlocks(input);
  const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS ?? "30000", 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL()}:generateContent`,
      {
        method: "POST",
        // Key in header, not URL — avoids leaking it into error/proxy logs.
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${SYSTEM_INSTRUCTION}\n\n${context}\n\nConversation so far:\n${convo}\nAssistant:`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error(`Gemini chat error ${res.status}`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) throw new Error("Empty Gemini chat response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function tryClaude(input: ChatInput, apiKey: string): Promise<string> {
  const { context, convo } = buildPromptBlocks(input);
  const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS ?? "30000", 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL ?? "claude-opus-4-7",
        max_tokens: 512,
        system: SYSTEM_INSTRUCTION,
        messages: [
          {
            role: "user",
            content: `${context}\n\nConversation so far:\n${convo}\nAssistant:`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Claude chat error ${res.status}`);
    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      json.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) throw new Error("Empty Claude chat response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function tryOpenAI(input: ChatInput, apiKey: string): Promise<string> {
  const { context, convo } = buildPromptBlocks(input);
  const text = await callOpenAIText({
    systemPrompt: SYSTEM_INSTRUCTION,
    userPayload: `${context}\n\nConversation so far:\n${convo}\nAssistant:`,
    temperature: 0.4,
    apiKey,
  });
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty OpenAI chat response");
  return trimmed;
}

/**
 * Chat Agent — the patient's AI assistant.
 *
 * Multi-provider: tries every configured provider in order (Gemini →
 * Claude → ChatGPT). A user-pasted demo key counts as configured and takes
 * priority over the backend env key for the same provider. When no provider
 * is configured (or all fail) a deterministic mock reply is returned that
 * still respects the safety rules.
 */
export async function runChatAgent(input: ChatInput): Promise<string> {
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const userText = lastUser?.content ?? "";

  const attempts: Array<() => Promise<string>> = [];
  const geminiKey = input.apiKeys?.gemini || process.env.GEMINI_API_KEY;
  const claudeKey = input.apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
  const openaiKey = input.apiKeys?.openai || process.env.OPENAI_API_KEY;
  if (geminiKey) attempts.push(() => tryGemini(input, geminiKey));
  if (claudeKey) attempts.push(() => tryClaude(input, claudeKey));
  if (openaiKey) attempts.push(() => tryOpenAI(input, openaiKey));

  for (const attempt of attempts) {
    try {
      const text = await attempt();
      // Belt-and-braces: append the disclaimer if the model omitted it.
      if (!text.toLowerCase().includes("not a diagnosis")) {
        return `${text}\n\n${SCREENING_DISCLAIMER}`;
      }
      return text;
    } catch {
      // Try the next configured provider.
    }
  }
  return fallbackReply(userText, input.patientContext);
}
