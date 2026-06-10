import Link from "next/link";
import {
  AGENT_REGISTRY,
  PATTERN_SOURCES,
  type RegisteredAgent,
} from "@/lib/agents/agentRegistry";

export const metadata = {
  title: "Introduction — How agentic is OralScan AI?",
};

const KIND_LABEL: Record<RegisteredAgent["kind"], string> = {
  orchestrator: "Orchestration",
  perception: "Perception",
  reasoning: "Reasoning",
  communication: "Communication",
  safety: "Safety",
  interface: "Interface / Gateway",
};

const FLOW_STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "📸",
    title: "1 · A photo arrives — from anywhere",
    body: "Web upload, live camera, or Telegram. On Telegram it is ZERO-PRESS: send a picture and the pipeline runs immediately with the active demo patient's records (history, habits, last scaling). /changepatient switches patients — that's the only command.",
  },
  {
    emoji: "🛂",
    title: "2 · The gateway normalizes the channel",
    body: "Web and Telegram both feed the SAME agent pipeline and the SAME shared datastore — one brain, many doors. A screening done in Telegram appears instantly in the doctor's queue.",
  },
  {
    emoji: "🧠",
    title: "3 · The Orchestrator dispatches the agents",
    body: "Toothbrush IoT telemetry → Vision (one call, two functions) → Cancer Risk Scoring → RAG grounding → Multi-Expert Panel (auto on Medium/High) → Patient Communication → Clinician Referral (only on High) → Triage → Dental Wellness. Every step is appended to a timestamped audit log.",
  },
  {
    emoji: "🔬",
    title: "4 · One picture, two detections",
    body: "Function 1: oral-cancer cues (finding, region, probability). Function 2: tooth health — cavity signs (蛀牙), gum redness, plaque, staining, hygiene score, and whether scaling (要不要洗牙) is due, using the patient's last-scaling record.",
  },
  {
    emoji: "🗂️",
    title: "5 · Everything becomes a record",
    body: "Sessions persist per patient in the shared store: the patient sees their risk-trend chart and brushing heatmap; the doctor sees the triage queue, full history, charts, and the patient's profile (name, age, race, habits, reports).",
  },
  {
    emoji: "🤖",
    title: "6 · Doctor-side agents close the loop",
    body: "A per-patient AI assistant screens the history through a real tool loop, and the cohort triage agent compares EVERY patient (\"which patient should I see first?\") with an urgency ranking it justifies number by number.",
  },
];

const PATTERN_MAPPING: {
  source: string;
  items: { pattern: string; ours: string; file: string }[];
}[] = [
  {
    source: "OpenClaw",
    items: [
      {
        pattern: "Gateway: many channels, one agent loop",
        ours: "Telegram and the web app are thin channel adapters over the same orchestrator pipeline and shared KV store.",
        file: "lib/telegram/handler.ts · app/api/screening/route.ts",
      },
      {
        pattern: "Zero-press, proactive agent",
        ours: "A photo is the only input needed — the agent acts immediately with the active patient's stored records, no buttons, no questions.",
        file: "lib/telegram/handler.ts",
      },
      {
        pattern: "Memory as plain, inspectable records",
        ours: "Patient profiles, sessions, and care threads are simple JSON records per patient — greppable, seedable, deletable.",
        file: "lib/server/repository.ts · lib/data/demoPatients.ts",
      },
      {
        pattern: "Heartbeat-style upkeep",
        ours: "Idempotent demo seeding runs on first contact, and the doctor queue live-polls so urgent cases surface without anyone asking.",
        file: "lib/server/demoSeed.ts · app/doctor/page.tsx",
      },
    ],
  },
  {
    source: "Claude Code",
    items: [
      {
        pattern: "Lead agent + parallel subagents",
        ours: "The Orchestrator delegates to specialised agents; the Multi-Expert Panel fans out 3 role-prompted experts IN PARALLEL and a Moderator synthesises the verdict — surfacing dissent, not hiding it.",
        file: "lib/agents/orchestratorAgent.ts · lib/agents/multiExpertPanel.ts",
      },
      {
        pattern: "Structured outputs, never raw text",
        ours: "Every LLM response is forced into typed JSON and coerced/clamped before any agent consumes it (Gemini uses a hard responseSchema).",
        file: "lib/visionProviders/shared.ts · lib/visionProviders/geminiVisionProvider.ts",
      },
      {
        pattern: "Audit log of every agent action",
        ours: "Each session carries a timestamped trace of every agent invocation, fallback, and skip — rendered in the UI and the Telegram trace message.",
        file: "lib/agents/orchestratorAgent.ts (auditLog)",
      },
      {
        pattern: "Permission boundaries",
        ours: "Role-gated routes (doctor vs patient), server-side authz on every API, and conditional agent activation (referral only on High risk).",
        file: "middleware.ts · app/api/doctor/assistant/route.ts",
      },
    ],
  },
  {
    source: "Hermes Agent (Nous Research)",
    items: [
      {
        pattern: "Central self-describing tool registry",
        ours: "Doctor-agent tools register themselves with name/description/params; one dispatcher handles lookup and error-wrapping. Add a tool to the list and the agent can use it immediately.",
        file: "lib/agents/tools/doctorTools.ts",
      },
      {
        pattern: "The core loop: model → tool → observation → repeat",
        ours: "The Doctor Assistant runs a real agentic loop (≤4 steps): the model picks a tool, the observation is appended, and it answers only when it has real data. The 🔧 chips in the UI are the live tool trace.",
        file: "lib/agents/doctorAssistantAgent.ts",
      },
      {
        pattern: "Provider/transport abstraction",
        ours: "One pipeline drives Anthropic Messages, OpenAI chat-completions, and Gemini generateContent behind a single VisionProvider interface — switch with a radio button or a pasted key.",
        file: "lib/agents/visionScreeningAgent.ts · lib/visionProviders/*",
      },
      {
        pattern: "Graceful fallback chains",
        ours: "Pasted demo key → backend env key → next provider → deterministic mock. The pipeline never crashes because a key is missing — it degrades and says so.",
        file: "lib/agents/visionScreeningAgent.ts (keyForProvider) · lib/agents/chatAgent.ts",
      },
    ],
  },
];

export default function IntroductionPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative background orbs (same language as the landing page) */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-lavender-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-lavender-200/50 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        {/* Brand bar */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-700 text-2xl text-white shadow-lg">
            🦷
          </div>
          <div>
            <p className="text-sm font-bold text-lavender-950">OralScan AI</p>
            <p className="text-[10px] uppercase tracking-widest text-lavender-700">
              Introduction · Agentic Architecture
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              href="/"
              className="rounded-xl border border-lavender-300 bg-white/80 px-4 py-2 text-sm font-semibold text-lavender-800 hover:bg-lavender-100"
            >
              ← Home
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-lavender-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-lavender-800"
            >
              Try the demo →
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lavender-300 bg-white/70 px-3 py-1 text-xs font-medium text-lavender-800 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-lavender-500" />
            {AGENT_REGISTRY.length} agents · 3 LLM providers · 2 channels · 1 picture, 2 functions
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-lavender-950 sm:text-5xl">
            How{" "}
            <span className="bg-gradient-to-r from-lavender-600 to-lavender-900 bg-clip-text text-transparent">
              agentic
            </span>{" "}
            is OralScan AI?
          </h1>
          <p className="mt-4 text-lg text-lavender-900/85">
            This page walks the entire demo end-to-end and shows exactly which
            design patterns we borrowed from today&apos;s leading agent
            harnesses — <b>OpenClaw</b>, <b>Claude Code</b>, and Nous
            Research&apos;s <b>Hermes Agent</b> — and where each one lives in
            our codebase.
          </p>
        </div>

        {/* The flow */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-lavender-950">
            🎬 The demo flow, end to end
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FLOW_STEPS.map((s) => (
              <article
                key={s.title}
                className="rounded-2xl border border-lavender-200 bg-white/80 p-5 shadow-card backdrop-blur"
              >
                <div className="text-2xl">{s.emoji}</div>
                <h3 className="mt-2 text-sm font-bold text-lavender-950">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-lavender-900/80">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Agent registry (rendered from code — cannot drift) */}
        <section className="mt-14">
          <h2 className="text-xl font-bold text-lavender-950">
            🗃️ The agent registry
          </h2>
          <p className="mt-1 text-sm text-lavender-900/70">
            Rendered live from{" "}
            <code className="rounded bg-lavender-100 px-1.5 py-0.5 font-mono text-[11px] text-lavender-800">
              lib/agents/agentRegistry.ts
            </code>{" "}
            — a Hermes-style self-describing registry, so this table can never
            drift from the code.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {AGENT_REGISTRY.map((a) => (
              <article
                key={a.name}
                className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{a.emoji}</span>
                  <h3 className="text-sm font-bold text-lavender-950">
                    {a.name}
                  </h3>
                  <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-700">
                    {KIND_LABEL[a.kind]}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-lavender-900/85">
                  {a.role}
                </p>
                <p className="mt-2 text-[11px] text-lavender-700">
                  ↳ <i>{a.pattern}</i>
                </p>
                <p className="mt-1 font-mono text-[10px] text-lavender-900/50">
                  {a.file}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Pattern mapping */}
        <section className="mt-14">
          <h2 className="text-xl font-bold text-lavender-950">
            🧬 Where each pattern came from
          </h2>
          <p className="mt-1 text-sm text-lavender-900/70">
            We studied three state-of-the-art agent harnesses and ported their
            core ideas into a medical-screening context.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {PATTERN_SOURCES.map((s) => (
              <article
                key={s.name}
                className="rounded-2xl border border-lavender-300 bg-lavender-50/70 p-4"
              >
                <h3 className="text-sm font-bold text-lavender-950">
                  {s.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-lavender-900/80">
                  {s.summary}
                </p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[11px] font-medium text-lavender-700 underline"
                >
                  {s.url.replace("https://", "")}
                </a>
              </article>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            {PATTERN_MAPPING.map((group) => (
              <div key={group.source}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-lavender-800">
                  Borrowed from {group.source}
                </h3>
                <div className="mt-2 overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-card">
                  {group.items.map((item, i) => (
                    <div
                      key={item.pattern}
                      className={`grid gap-2 p-4 md:grid-cols-[1fr_1.4fr_auto] md:items-start ${
                        i > 0 ? "border-t border-lavender-100" : ""
                      }`}
                    >
                      <p className="text-xs font-semibold text-lavender-950">
                        {item.pattern}
                      </p>
                      <p className="text-xs leading-relaxed text-lavender-900/80">
                        {item.ours}
                      </p>
                      <p className="font-mono text-[10px] text-lavender-900/50 md:text-right">
                        {item.file}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Try it */}
        <section className="mt-14 rounded-3xl border border-lavender-300 bg-white/80 p-6 shadow-card backdrop-blur">
          <h2 className="text-xl font-bold text-lavender-950">
            🧪 Try the demo in 2 minutes
          </h2>
          <ol className="mt-3 space-y-2 text-sm text-lavender-900">
            <li>
              <b>1.</b> Sign in as <code className="rounded bg-lavender-100 px-1 font-mono text-xs">doctor / doctor</code>{" "}
              → open <b>Patients</b> → click <b>🌱 Load demo patients</b>. Three
              patients appear with full records (Aisyah, Tan, Muthu — name,
              age, race, habits, brushing times, last scaling, reports).
            </li>
            <li>
              <b>2.</b> Ask the <b>AI Triage Agent</b>:{" "}
              <i>&quot;Which patient should I see first?&quot;</i> — watch the
              🔧 tool-trace chips as the agent calls{" "}
              <code className="rounded bg-lavender-100 px-1 font-mono text-xs">compare_all_patients</code>.
            </li>
            <li>
              <b>3.</b> Sign in as <code className="rounded bg-lavender-100 px-1 font-mono text-xs">patient1 / patient1</code>{" "}
              → <b>New Screening</b> → optionally paste your own ChatGPT /
              Gemini / Claude key (🔑 panel) → run. One picture returns both the
              cancer screening and the tooth-health report (蛀牙 · 洗牙).
            </li>
            <li>
              <b>4.</b> On Telegram, just <b>send the bot a photo</b> — zero
              presses. It screens as the active demo patient with their stored
              records; <code className="rounded bg-lavender-100 px-1 font-mono text-xs">/changepatient</code>{" "}
              switches.
            </li>
          </ol>
          <p className="mt-4 rounded-xl border border-lavender-200 bg-lavender-50 p-3 text-xs text-lavender-900/80">
            ⚠️ Educational university prototype — not a medical device and not
            a diagnosis. Always consult a qualified dentist or doctor.
          </p>
        </section>

        <footer className="mt-10 pb-6 text-center text-[11px] text-lavender-900/50">
          OralScan AI · University IDP · Agentic AI prototype — patterns
          referenced from OpenClaw, Claude Code, and Hermes Agent docs.
        </footer>
      </div>
    </main>
  );
}
