/**
 * Layered architecture diagram for the /introduction page.
 *
 * Designed to be read top-to-bottom by a NON-technical audience:
 * people & channels → one gateway → the lead agent → the specialist
 * agents → the AI models → shared memory → what comes back out.
 *
 * Colored dots tag each box with the harness pattern it borrows:
 *   ● sky = OpenClaw · ● violet = Claude Code · ● emerald = Hermes
 */

type Source = "openclaw" | "claudecode" | "hermes";

const DOT: Record<Source, string> = {
  openclaw: "bg-sky-500",
  claudecode: "bg-violet-500",
  hermes: "bg-emerald-500",
};

function Dots({ sources }: { sources: Source[] }) {
  return (
    <span className="ml-auto flex flex-shrink-0 gap-1">
      {sources.map((s) => (
        <span key={s} className={`h-2 w-2 rounded-full ${DOT[s]}`} />
      ))}
    </span>
  );
}

function Box({
  emoji,
  title,
  sub,
  sources = [],
  tone = "white",
}: {
  emoji: string;
  title: string;
  sub?: string;
  sources?: Source[];
  tone?: "white" | "deep";
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col rounded-xl border p-3 ${
        tone === "deep"
          ? "border-lavender-400 bg-lavender-100/80"
          : "border-lavender-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none">{emoji}</span>
        <p className="truncate text-[12px] font-bold text-lavender-950">
          {title}
        </p>
        {sources.length > 0 && <Dots sources={sources} />}
      </div>
      {sub && (
        <p className="mt-1 text-[10px] leading-snug text-lavender-900/70">
          {sub}
        </p>
      )}
    </div>
  );
}

function Chip({ label, badge }: { label: string; badge?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-lavender-200 bg-white px-2 py-1 text-[10px] font-semibold text-lavender-900">
      {label}
      {badge && (
        <span className="rounded-full bg-amber-100 px-1.5 py-px text-[8px] font-bold uppercase text-amber-800">
          {badge}
        </span>
      )}
    </span>
  );
}

function LayerHeader({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-lavender-700 text-[10px] font-bold text-white">
        {n}
      </span>
      <p className="text-[12px] font-bold uppercase tracking-wider text-lavender-900">
        {title}
      </p>
      <p className="hidden text-[10px] text-lavender-900/60 sm:block">{hint}</p>
    </div>
  );
}

function DownArrow({ label }: { label?: string }) {
  return (
    <div className="my-1.5 flex items-center justify-center gap-2">
      <span className="text-lg leading-none text-lavender-400">▼</span>
      {label && (
        <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-[9px] font-semibold text-lavender-700">
          {label}
        </span>
      )}
      <span className="text-lg leading-none text-lavender-400">▼</span>
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="rounded-3xl border border-lavender-300 bg-lavender-50/50 p-4 shadow-card sm:p-6">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-lavender-200 bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-lavender-800">
          Pattern borrowed from:
        </p>
        <span className="flex items-center gap-1 text-[10px] text-lavender-900">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> OpenClaw
        </span>
        <span className="flex items-center gap-1 text-[10px] text-lavender-900">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> Claude Code
        </span>
        <span className="flex items-center gap-1 text-[10px] text-lavender-900">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hermes Agent
        </span>
      </div>

      {/* 1 · People & channels */}
      <section>
        <LayerHeader
          n={1}
          title="People & channels"
          hint="four doors into the same brain"
        />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Box emoji="🧑" title="Patient · web" sub="Camera / upload + questionnaire" />
          <Box emoji="🩺" title="Doctor · web" sub="Triage queue, reviews, AI agent" />
          <Box
            emoji="📲"
            title="Telegram"
            sub="ZERO-PRESS: photo in → report out (/changepatient switches)"
            sources={["openclaw"]}
          />
          <Box
            emoji="🔐"
            title="Admin · /admin"
            sub="Pastes the 3 API keys once — applies to everyone instantly"
          />
        </div>
      </section>

      <DownArrow label="every channel sends the SAME request" />

      {/* 2 · Gateway */}
      <section>
        <LayerHeader
          n={2}
          title="Gateway & security"
          hint="one entrance, role-checked"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Box
            emoji="🛂"
            title="Login & roles"
            sub="patient / doctor / admin — every API checks server-side"
            sources={["claudecode"]}
          />
          <Box
            emoji="🚪"
            title="Channel adapters"
            sub="Web routes + Telegram webhook feed ONE pipeline"
            sources={["openclaw"]}
          />
          <Box
            emoji="🔑"
            title="Key resolution"
            sub="your pasted key → admin key → backend key → offline mock"
            sources={["hermes"]}
          />
        </div>
      </section>

      <DownArrow label="screening request" />

      {/* 3 · Orchestrator */}
      <section>
        <LayerHeader
          n={3}
          title="The lead agent"
          hint="plans, delegates, records everything"
        />
        <Box
          emoji="🧠"
          title="Orchestrator Agent"
          sub="Dispatches every specialist below in order · writes a timestamped audit log of every call, fallback, and skip"
          sources={["claudecode"]}
          tone="deep"
        />
      </section>

      <DownArrow label="delegates to specialists" />

      {/* 4 · Specialist agents */}
      <section>
        <LayerHeader
          n={4}
          title="Specialist agents"
          hint="each does ONE job well"
        />
        <div className="rounded-xl border border-lavender-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip label="🪥 Toothbrush IoT" />
            <span className="text-lavender-300">→</span>
            <Chip label="👁️ Vision — 1 photo, 2 functions" />
            <span className="text-lavender-300">→</span>
            <Chip label="📊 Cancer Risk 0–100" />
            <span className="text-lavender-300">→</span>
            <Chip label="📚 RAG grounding" />
            <span className="text-lavender-300">→</span>
            <Chip label="🧑‍⚕️ Expert Panel ×3 ∥" badge="Med/High" />
            <span className="text-lavender-300">→</span>
            <Chip label="💬 Patient Report" />
            <span className="text-lavender-300">→</span>
            <Chip label="🏥 Referral" badge="High only" />
            <span className="text-lavender-300">→</span>
            <Chip label="🚦 Triage" />
            <span className="text-lavender-300">→</span>
            <Chip label="🦷 Tooth Health 蛀牙·洗牙" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-lavender-950">
                🧑‍⚕️ Multi-Expert Panel <Dots sources={["claudecode"]} />
              </p>
              <p className="text-[10px] text-lavender-900/70">
                Pathologist (Claude) + Epidemiologist + Dentist (Gemini) debate
                IN PARALLEL → a Moderator synthesises the verdict and shows
                disagreement instead of hiding it.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-lavender-950">
                🤖 Doctor Assistant — tool loop <Dots sources={["hermes"]} />
              </p>
              <p className="text-[10px] text-lavender-900/70">
                model → tool → observation → repeat (≤4 steps) over a registry:
                get_patient_profile · list_patient_sessions ·
                compare_all_patients (&quot;who should I see first?&quot;).
              </p>
            </div>
          </div>
        </div>
      </section>

      <DownArrow label="agents call the models — never raw text, always typed JSON" />

      {/* 5 · Models */}
      <section>
        <LayerHeader
          n={5}
          title="AI models — swappable"
          hint="pick any, or paste your own key"
        />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Box emoji="🟢" title="ChatGPT" sub="OpenAI chat-completions" sources={["hermes"]} />
          <Box emoji="🔵" title="Gemini" sub="generateContent + hard JSON schema" sources={["hermes", "claudecode"]} />
          <Box emoji="🟠" title="Claude" sub="Anthropic Messages API" sources={["hermes"]} />
          <Box emoji="⚙️" title="Mock fallback" sub="No key? Deterministic offline result — never crashes" sources={["hermes"]} />
        </div>
      </section>

      <DownArrow label="every result becomes a record" />

      {/* 6 · Memory */}
      <section>
        <LayerHeader
          n={6}
          title="Shared memory"
          hint="plain, inspectable records"
        />
        <Box
          emoji="🗂️"
          title="KV store (Upstash Redis)"
          sub="Screening sessions · patient profiles (age, race, habits, last scaling 洗牙) · brushing logs · doctor↔patient messages · admin keys — one record set shared by web AND Telegram"
          sources={["openclaw"]}
          tone="deep"
        />
      </section>

      <DownArrow label="results flow back out" />

      {/* 7 · Outcomes */}
      <section>
        <LayerHeader n={7} title="What comes back" hint="same data, three views" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Box
            emoji="🧑"
            title="Patient gets"
            sub="Risk band + plain-language report + tooth-health card + trend chart + brushing heatmap"
          />
          <Box
            emoji="🩺"
            title="Doctor gets"
            sub="Urgency-ranked queue + full history + AI agent answers with real numbers"
          />
          <Box
            emoji="📲"
            title="Telegram gets"
            sub="Both reports in one message + the agent pipeline trace"
            sources={["openclaw"]}
          />
        </div>
      </section>

      <figcaption className="mt-4 border-t border-lavender-200 pt-3 text-center text-[10px] text-lavender-900/60">
        One photo enters at the top through any door · ~14 agents collaborate in
        the middle · the same shared record comes out of every door at the
        bottom. Educational prototype — not a diagnosis.
      </figcaption>
    </figure>
  );
}
