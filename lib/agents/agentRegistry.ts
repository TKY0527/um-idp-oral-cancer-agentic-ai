/**
 * Agent registry — a single self-describing list of every agent in the
 * system (the Hermes "central registry" idea applied to agents instead of
 * tools). The /introduction page renders this directly, so the docs can
 * never drift from the code: add an agent here and it appears on the page.
 */

export type AgentKind =
  | "orchestrator"
  | "perception"
  | "reasoning"
  | "communication"
  | "safety"
  | "interface";

export interface RegisteredAgent {
  name: string;
  emoji: string;
  kind: AgentKind;
  file: string;
  role: string;
  /** Which framework pattern it demonstrates (OpenClaw / Claude Code / Hermes). */
  pattern: string;
}

export const AGENT_REGISTRY: RegisteredAgent[] = [
  {
    name: "Orchestrator Agent",
    emoji: "🧠",
    kind: "orchestrator",
    file: "lib/agents/orchestratorAgent.ts",
    role: "The only agent that knows the full pipeline. Creates the session, dispatches every sub-agent in order, collects the audit log, assembles the final record.",
    pattern: "Claude Code: lead agent + subagent delegation (the Task/Agent tool pattern)",
  },
  {
    name: "Toothbrush IoT Agent",
    emoji: "🪥",
    kind: "perception",
    file: "lib/agents/toothbrushIoTAgent.ts",
    role: "Simulates smart-toothbrush telemetry: brushing duration, pressure, coverage, image quality — the IoT sensor layer of the concept.",
    pattern: "OpenClaw: peripheral/device signals feeding one agent loop",
  },
  {
    name: "Vision Screening Agent",
    emoji: "👁️",
    kind: "perception",
    file: "lib/agents/visionScreeningAgent.ts",
    role: "ONE image → TWO functions in a single call: oral-cancer cues AND tooth-health signs. Pluggable provider (Gemini / Claude / ChatGPT / local / mock) with automatic mock fallback.",
    pattern: "Hermes: provider/transport abstraction — one loop drives Anthropic Messages, OpenAI chat-completions, and Gemini generateContent",
  },
  {
    name: "Cancer Risk Scoring Agent",
    emoji: "📊",
    kind: "reasoning",
    file: "lib/agents/cancerRiskScoringAgent.ts",
    role: "Deterministic 0–100 risk score from vision + questionnaire + telemetry, with literature-calibrated weights (IARC, INHANCE).",
    pattern: "Claude Code: deterministic code where determinism matters, LLMs only where judgement matters",
  },
  {
    name: "Dental Wellness Agent",
    emoji: "🦷",
    kind: "reasoning",
    file: "lib/agents/dentalWellnessAgent.ts",
    role: "Function 2 on the same picture: cavity risk (蛀牙), gum condition, plaque, staining, hygiene score, and the scaling (洗牙) recommendation using the patient's last-scaling record.",
    pattern: "OpenClaw: memory-aware decisions (uses the patient's stored care record)",
  },
  {
    name: "Multi-Expert Panel",
    emoji: "🧑‍⚕️",
    kind: "reasoning",
    file: "lib/agents/multiExpertPanel.ts",
    role: "Three role-prompted experts (Oral Pathologist on Claude, Epidemiologist + General Dentist on Gemini) deliberate in parallel on Medium/High risk; a deterministic Moderator synthesises the verdict and surfaces dissent.",
    pattern: "Claude Code: parallel subagent fan-out + judge/moderator synthesis",
  },
  {
    name: "Consensus Agent",
    emoji: "🤝",
    kind: "reasoning",
    file: "lib/agents/consensusAgent.ts",
    role: "Runs a second vision provider on the same image and scores cross-model agreement (finding, probability bucket, region).",
    pattern: "Claude Code: adversarial verification — independent models cross-check each other",
  },
  {
    name: "Retrieval Agent (RAG v2)",
    emoji: "📚",
    kind: "reasoning",
    file: "lib/agents/retrievalAgent.ts · lib/retrieval/engine.ts",
    role: "BM25 retrieval over a 23-document oral-cancer + dental-health knowledge base, with bilingual synonym expansion (蛀牙→caries, 洗牙→scaling) and CJK-aware tokenization. Grounds BOTH functions, the patient chat, and the doctor agent (search_knowledge tool) with citable sources.",
    pattern: "OpenClaw: knowledge files the agent consults at runtime; Claude Code: grounded, citable answers",
  },
  {
    name: "Skills Library",
    emoji: "🧩",
    kind: "reasoning",
    file: "lib/skills/index.ts",
    role: "Five care-protocol skills (scaling advice 洗牙, betel/tobacco cessation, post-screening care, brushing coaching, referral letters). Agents read the matching protocol AT RUNTIME before giving suggestions — patient chat auto-injects it; the doctor agent fetches it via get_skill.",
    pattern: "OpenClaw / Claude Code: SKILL.md — capabilities as plain instruction files, not hardcoded prompts",
  },
  {
    name: "MCP Server",
    emoji: "🔌",
    kind: "interface",
    file: "app/api/mcp/route.ts",
    role: "A real Model Context Protocol endpoint (JSON-RPC 2.0, streamable HTTP): external AI clients like Claude Desktop or Claude Code can connect with a bearer token and call the SAME tool registry the internal agent uses — one registry, two surfaces.",
    pattern: "Claude Code / MCP: open tool protocol for cross-agent interoperability",
  },
  {
    name: "Patient Communication Agent",
    emoji: "💬",
    kind: "communication",
    file: "lib/agents/patientCommunicationAgent.ts",
    role: "Turns the clinical output into a calm, plain-language patient report with a mandatory disclaimer.",
    pattern: "Hermes: post-processing hooks that enforce output policy",
  },
  {
    name: "Clinician Referral Agent",
    emoji: "🏥",
    kind: "communication",
    file: "lib/agents/clinicianReferralAgent.ts",
    role: "Generates a structured referral packet — but ONLY when risk is High (conditional activation).",
    pattern: "Claude Code: conditional tool/agent activation based on state",
  },
  {
    name: "Triage Prioritization Agent",
    emoji: "🚦",
    kind: "reasoning",
    file: "lib/agents/triagePrioritizationAgent.ts",
    role: "Computes urgency + SLA for the doctor queue so the most at-risk patients surface first.",
    pattern: "OpenClaw: proactive heartbeat-style prioritisation of what needs attention",
  },
  {
    name: "Doctor Assistant Agent",
    emoji: "🤖",
    kind: "interface",
    file: "lib/agents/doctorAssistantAgent.ts",
    role: "A REAL agentic tool loop: the model calls registry tools (get_patient_profile, list_patient_sessions, compare_all_patients) to fetch live data, observes results, repeats, then answers the doctor — including 'which patient should I see first?'.",
    pattern: "Hermes: core loop (model call → tool dispatch → observation → repeat) over a central tool registry",
  },
  {
    name: "Patient Chat Agent",
    emoji: "🗨️",
    kind: "interface",
    file: "lib/agents/chatAgent.ts",
    role: "The patient's AI assistant. Multi-provider (Gemini → Claude → ChatGPT) with a deterministic safe fallback; safety rules enforced in the system prompt and re-checked in code.",
    pattern: "Hermes: provider fallback chain; Claude Code: layered safety (prompt + code guard)",
  },
  {
    name: "Telegram Gateway",
    emoji: "📲",
    kind: "interface",
    file: "lib/telegram/handler.ts",
    role: "Zero-press channel adapter: a photo from Telegram enters the SAME pipeline as the web app, auto-using the active demo patient's records; /changepatient switches. Results flow back to the doctor dashboard.",
    pattern: "OpenClaw: Gateway — many channels (web, Telegram), one agent loop, shared memory",
  },
];

export const PATTERN_SOURCES = [
  {
    name: "OpenClaw",
    url: "https://docs.openclaw.ai/concepts/architecture",
    summary:
      "Open-source persistent personal agent (formerly Clawdbot/Moltbot): a Gateway routes every channel (Telegram, WhatsApp, …) into one agent loop; skills are plain files read at runtime; a heartbeat cron makes it proactive; memory is inspectable files.",
  },
  {
    name: "Claude Code",
    url: "https://code.claude.com/docs",
    summary:
      "Anthropic's agentic coding harness: a lead agent plans and delegates to parallel subagents, tools run behind permission policies, outputs are structured and auditable, and skills/hooks extend behaviour.",
  },
  {
    name: "Hermes Agent (Nous Research)",
    url: "https://hermes-agent.nousresearch.com/docs/developer-guide/architecture",
    summary:
      "Open agent harness: a central self-registering tool registry, the classic core loop (model call → tool dispatch → result append → repeat), provider/transport adapters that normalize OpenAI/Anthropic/Gemini APIs, and lifecycle hooks for policy.",
  },
];
