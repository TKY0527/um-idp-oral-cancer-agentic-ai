import type { ChatRole, RiskLevel } from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";

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
}

const SYSTEM_INSTRUCTION = `You are the patient-facing AI Health Assistant inside an educational oral cancer screening prototype. Rules you MUST follow:
- You are NOT a doctor. You never confirm or rule out cancer.
- You answer in calm, plain language at a 7th-grade reading level.
- You always append a brief disclaimer when discussing risk or symptoms.
- If asked about emergencies, tell the user to seek in-person care.
- Stay focused on oral health topics. Politely redirect off-topic questions.
- If the user asks for diagnosis, refuse and recommend a dentist.
- Keep answers under 120 words unless the user explicitly asks for more detail.`;

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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

/**
 * Chat Agent
 *
 * Conversational assistant for the Patient Dashboard. Uses Gemini if a
 * key is available, otherwise returns a deterministic mock reply that
 * still respects the safety rules.
 */
export async function runChatAgent(input: ChatInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const userText = lastUser?.content ?? "";

  if (!apiKey) {
    return fallbackReply(userText, input.patientContext);
  }

  const ctxBlock = input.patientContext
    ? `Patient context: latestRiskLevel=${input.patientContext.latestRiskLevel ?? "n/a"}, ` +
      `latestScore=${input.patientContext.latestScore ?? "n/a"}, ` +
      `latestFinding=${input.patientContext.latestFinding ?? "n/a"}.`
    : "Patient context: no screening yet.";

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `${SYSTEM_INSTRUCTION}\n\n${ctxBlock}\n\nConversation so far:\n` +
            input.messages
              .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
              .join("\n") +
            `\nAssistant:`,
        },
      ],
    },
  ];

  const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS ?? "30000", 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      return fallbackReply(userText, input.patientContext);
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) return fallbackReply(userText, input.patientContext);
    // Belt-and-braces: append the disclaimer if the model omitted it.
    if (!text.toLowerCase().includes("not a diagnosis")) {
      return `${text}\n\n${SCREENING_DISCLAIMER}`;
    }
    return text;
  } catch {
    return fallbackReply(userText, input.patientContext);
  } finally {
    clearTimeout(timer);
  }
}
