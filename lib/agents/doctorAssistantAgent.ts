import type {
  ChatRole,
  ProviderKeys,
  ScreeningSession,
} from "@/lib/types/screening";
import type { DemoPatientProfile } from "@/lib/data/demoPatients";
import { callOpenAIText } from "@/lib/agents/experts/_openaiTextExpert";
import {
  cohortUrgency,
  dispatchDoctorTool,
  toolCatalogForPrompt,
  type DoctorToolContext,
} from "@/lib/agents/tools/doctorTools";

export interface DoctorAssistantInput {
  messages: { role: ChatRole; content: string }[];
  patientLabel: string;
  /** "*" = cohort mode (compare every patient). */
  patientId: string;
  /** Preloaded sessions — used only by the offline fallback. */
  sessions: ScreeningSession[];
  profile?: DemoPatientProfile;
  /** Demo BYOK: user-pasted keys — take priority over backend env keys. */
  apiKeys?: ProviderKeys;
}

export interface ToolTraceEntry {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
}

export interface DoctorAssistantResult {
  reply: string;
  /** The agentic tool-use trace (shown in the UI like an agent transcript). */
  trace: ToolTraceEntry[];
}

const MAX_LOOP_STEPS = 4;

const SYSTEM_INSTRUCTION = `You are the clinician-facing AI agent inside an educational oral cancer screening prototype. You help a DOCTOR review patients by CALLING TOOLS to fetch live data, then answering.

## Tools available
${"{TOOL_CATALOG}"}

## Protocol (STRICT)
Respond with ONLY one JSON object per turn, no other text:
- To call a tool:   {"action":"tool","name":"<tool_name>","args":{...}}
- To answer:        {"action":"final","answer":"<your answer for the doctor>"}

Call tools FIRST to get real data — never invent numbers. Usually: get_patient_profile and/or list_patient_sessions for one patient; compare_all_patients when asked who to prioritise. After at most 3 tool calls you MUST give the final answer.

## Answer rules
- You support clinical reasoning; you NEVER give a definitive diagnosis. Histopathology decides.
- Lead with the answer, then the evidence: cite concrete numbers (dates, risk scores, hygiene scores, months since scaling).
- Flag red-flag patterns: rising risk trend, lesion >2 weeks, high-risk sites (lateral tongue, floor of mouth), tobacco/alcohol/betel, age >40, overdue scaling.
- Recommendations are suggestions for the clinician's judgement.
- Stay under 200 words unless asked for more.
- Append "Prototype decision-support — verify against clinical examination." when giving recommendations.`;

function buildSystem(): string {
  return SYSTEM_INSTRUCTION.replace("{TOOL_CATALOG}", toolCatalogForPrompt());
}

function extractJson(text: string): Record<string, unknown> | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const a = candidate.indexOf("{");
  const b = candidate.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    return JSON.parse(candidate.slice(a, b + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Single-step model call (provider-agnostic, BYOK-first) ──────────────────

async function tryGemini(
  apiKey: string,
  system: string,
  payload: string
): Promise<string> {
  const model = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.5-flash";
  const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS ?? "30000", 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        // Key in header, not URL — avoids leaking it into error/proxy logs.
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${system}\n\n${payload}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) throw new Error("Empty Gemini response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function tryClaude(
  apiKey: string,
  system: string,
  payload: string
): Promise<string> {
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
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: payload }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}`);
    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      json.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) throw new Error("Empty Claude response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One model call through whichever provider is configured — pasted demo
 * key first, then backend env key; Claude → Gemini → ChatGPT order.
 * (The Hermes "transport adapter" idea: same loop, normalized providers.)
 */
async function callModelOnce(
  system: string,
  payload: string,
  apiKeys?: ProviderKeys
): Promise<string | null> {
  const claudeKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
  const geminiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY;
  const openaiKey = apiKeys?.openai || process.env.OPENAI_API_KEY;

  const attempts: Array<() => Promise<string>> = [];
  if (claudeKey) attempts.push(() => tryClaude(claudeKey, system, payload));
  if (geminiKey) attempts.push(() => tryGemini(geminiKey, system, payload));
  if (openaiKey)
    attempts.push(() =>
      callOpenAIText({
        systemPrompt: system,
        userPayload: payload,
        temperature: 0.3,
        apiKey: openaiKey,
      }).then((t) => {
        const trimmed = t.trim();
        if (!trimmed) throw new Error("Empty OpenAI response");
        return trimmed;
      })
    );

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch {
      // Next provider.
    }
  }
  return null;
}

// ── Offline fallback (no provider configured / all failed) ──────────────────

function fallbackSinglePatient(input: DoctorAssistantInput): string {
  const ordered = [...input.sessions].sort(
    (a, b) =>
      new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
  );
  if (ordered.length === 0) {
    return (
      `No screenings on record yet for ${input.patientLabel}. ` +
      `Ask the patient to run a screening (web or Telegram) and the history will appear here.`
    );
  }
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const delta = last.risk.score - first.risk.score;
  const trend =
    ordered.length === 1
      ? "single data point"
      : delta > 5
        ? `worsening (+${delta} points since ${first.finishedAt.slice(0, 10)})`
        : delta < -5
          ? `improving (${delta} points since ${first.finishedAt.slice(0, 10)})`
          : "stable";

  const { reasons } = cohortUrgency(ordered, input.profile);

  return (
    `Offline summary for ${input.patientLabel} (no LLM key configured):\n\n` +
    `• Screenings on record: ${ordered.length}\n` +
    `• Latest: ${last.finishedAt.slice(0, 10)} — ${last.risk.riskLevel} risk, score ${last.risk.score}/100, finding "${last.vision.visualFinding}"${
      last.vision.suspectedRegion !== "none" &&
      last.vision.suspectedRegion !== "unknown"
        ? ` at ${last.vision.suspectedRegion}`
        : ""
    }\n` +
    `• Trend: ${trend}\n` +
    (last.dentalWellness
      ? `• Tooth health: hygiene ${last.dentalWellness.hygieneScore}/100, cavity risk ${last.dentalWellness.cavityRisk}, gums ${last.dentalWellness.gumCondition}${
          last.dentalWellness.scalingAdvice
            ? `, scaling: ${last.dentalWellness.scalingAdvice.level.replace("_", " ")}`
            : ""
        }\n`
      : "") +
    `• Notes: ${reasons.join("; ")}\n` +
    `\nPaste an OpenAI / Gemini / Claude API key (or configure one on the backend) for full conversational analysis. ` +
    `Prototype decision-support — verify against clinical examination.`
  );
}

async function fallbackCohort(): Promise<string> {
  const result = (await dispatchDoctorTool(
    "compare_all_patients",
    {},
    { patientId: "*" }
  )) as {
    patients?: Array<{
      name: string;
      latestRisk: string;
      urgencyScore: number;
      urgencyReasons: string[];
    }>;
  };
  const rows = result.patients ?? [];
  if (rows.length === 0) {
    return "No patients with screenings yet. Seed the demo patients or run a screening first.";
  }
  const lines = rows.map(
    (r, i) =>
      `${i + 1}. ${r.name} — ${r.latestRisk}, urgency ${r.urgencyScore} (${r.urgencyReasons.join("; ")})`
  );
  return (
    `Offline cohort ranking (no LLM key configured) — most urgent first:\n\n` +
    lines.join("\n") +
    `\n\nSuggested next appointment: ${rows[0].name}. ` +
    `Prototype decision-support — verify against clinical examination.`
  );
}

// ── The agent loop ───────────────────────────────────────────────────────────

/**
 * Doctor Assistant Agent — a real agentic loop (the Hermes/Claude Code
 * pattern): model call → tool dispatch → observation appended → repeat,
 * until the model emits a final answer or the step budget runs out.
 */
export async function runDoctorAssistantAgent(
  input: DoctorAssistantInput
): Promise<DoctorAssistantResult> {
  const system = buildSystem();
  const ctx: DoctorToolContext = { patientId: input.patientId };
  const trace: ToolTraceEntry[] = [];

  const convo = input.messages
    .map((m) => `${m.role === "user" ? "Doctor" : "Assistant"}: ${m.content}`)
    .join("\n");

  // The running transcript the model sees: conversation + tool observations.
  let transcript =
    `SELECTED PATIENT: ${input.patientLabel} (patientId: ${input.patientId})\n\n` +
    `Conversation so far:\n${convo}\n\n` +
    `Respond with the JSON protocol now.`;

  for (let step = 0; step < MAX_LOOP_STEPS; step++) {
    const lastStep = step === MAX_LOOP_STEPS - 1;
    const raw = await callModelOnce(
      system,
      lastStep
        ? `${transcript}\n\n(You have used your tool budget — you MUST respond with {"action":"final", ...} now.)`
        : transcript,
      input.apiKeys
    );

    if (raw === null) {
      // No provider configured (or all failed) → deterministic offline path.
      const reply =
        input.patientId === "*"
          ? await fallbackCohort()
          : fallbackSinglePatient(input);
      return { reply, trace };
    }

    const parsed = extractJson(raw);
    if (!parsed) {
      // Model ignored the protocol — treat its text as the final answer.
      return { reply: raw, trace };
    }

    if (parsed.action === "tool" && typeof parsed.name === "string") {
      const args = (parsed.args ?? {}) as Record<string, unknown>;
      const observation = await dispatchDoctorTool(parsed.name, args, ctx);
      const ok = !(observation as { error?: string })?.error;
      trace.push({ tool: parsed.name, args, ok });
      transcript +=
        `\n\nTOOL CALL: ${parsed.name}(${JSON.stringify(args)})\n` +
        `OBSERVATION: ${JSON.stringify(observation)}\n\n` +
        `Continue with the JSON protocol.`;
      continue;
    }

    if (parsed.action === "final" && typeof parsed.answer === "string") {
      return { reply: parsed.answer, trace };
    }

    // Unrecognized JSON shape — return whatever text we have.
    return { reply: typeof parsed.answer === "string" ? parsed.answer : raw, trace };
  }

  // Step budget exhausted without a final answer.
  return {
    reply:
      "I gathered the data but ran out of reasoning steps — please ask again or narrow the question.",
    trace,
  };
}
