import Link from "next/link";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative background orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-lavender-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-lavender-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-lavender-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-16">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-700 text-2xl text-white shadow-lg">
            🦷
          </div>
          <div>
            <p className="text-sm font-bold text-lavender-950">OralScan AI</p>
            <p className="text-[10px] uppercase tracking-widest text-lavender-700">
              University IDP · Agentic AI Prototype
            </p>
          </div>
          <Link
            href="/login"
            className="ml-auto rounded-xl bg-lavender-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-lavender-800"
          >
            Sign in →
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-12 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lavender-300 bg-white/70 px-3 py-1 text-xs font-medium text-lavender-800 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-lavender-500" />
            Smart Toothbrush IoT · Hierarchical Multi-Agent System
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-lavender-950 sm:text-5xl lg:text-6xl">
            Agentic AI for{" "}
            <span className="bg-gradient-to-r from-lavender-600 to-lavender-900 bg-clip-text text-transparent">
              oral cancer screening
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-lavender-900/85">
            10 specialised agents collaborate on every screening — Vision, Toothbrush
            IoT telemetry, Cancer Risk Scoring, Multi-LLM Consensus, RAG-grounded
            explanation, Triage Prioritization, and more. Patient and clinician each
            get their own dashboard.
          </p>
        </div>

        {/* Role selection */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <RoleCard
            href="/patient"
            emoji="🦷"
            badge="Patient"
            title="Patient Dashboard"
            description="Run a screening with your camera or sample case. View your risk trend over time. Chat with the AI assistant about what your result means."
            ctas={[
              { label: "New screening", href: "/patient/screening" },
              { label: "AI assistant", href: "/patient/chat" },
              { label: "History", href: "/patient/history" },
            ]}
          />
          <RoleCard
            href="/doctor"
            emoji="🩺"
            badge="Doctor"
            title="Clinician Console"
            description="Review the triage queue sorted by AI-calculated urgency. Dive into any session: heatmap, multi-LLM consensus, audit log. Record your clinical decision."
            ctas={[
              { label: "Triage queue", href: "/doctor" },
              { label: "Analytics", href: "/doctor/analytics" },
            ]}
            dark
          />
        </div>

        {/* Tech depth strip */}
        <section className="mt-16 rounded-3xl border border-lavender-200 bg-white/70 p-6 shadow-card backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-lavender-700">
            Under the hood
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TechPill emoji="🧠" title="10 Agents" body="Orchestrator + 5 core + Chat + Consensus + Triage + Retrieval" />
            <TechPill emoji="🔌" title="4 Pluggable Vision Providers" body="Mock · Gemini · Claude · Future Local Model" />
            <TechPill emoji="📡" title="SSE Real-time Streaming" body="Each agent's progress streamed live to the UI" />
            <TechPill emoji="🤝" title="Multi-LLM Consensus" body="Run Gemini + Claude in parallel; compute agreement" />
            <TechPill emoji="🔥" title="Region Heatmap" body="Structured-output bounding boxes overlaid on the image" />
            <TechPill emoji="📚" title="RAG Grounding" body="Knowledge base of oral cancer references" />
            <TechPill emoji="📷" title="In-browser Camera" body="getUserMedia · capture without upload" />
            <TechPill emoji="🔒" title="Local-first" body="No backend · localStorage history · privacy by design" />
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mt-10 rounded-2xl border border-lavender-300 bg-white/70 p-4 text-xs text-lavender-900/80 shadow-card backdrop-blur">
          ⚠️ {SCREENING_DISCLAIMER}
        </div>

        <footer className="mt-10 text-center text-xs text-lavender-700">
          University IDP · Educational use only · Not a medical device
        </footer>
      </div>
    </main>
  );
}

function RoleCard({
  href,
  emoji,
  badge,
  title,
  description,
  ctas,
  dark,
}: {
  href: string;
  emoji: string;
  badge: string;
  title: string;
  description: string;
  ctas: { label: string; href: string }[];
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-3xl border p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover ${
        dark
          ? "border-lavender-800 bg-gradient-to-br from-lavender-900 to-lavender-950 text-white"
          : "border-lavender-200 bg-gradient-to-br from-white to-lavender-50 text-lavender-950"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl transition-opacity ${
          dark ? "bg-lavender-500/30" : "bg-lavender-300/40"
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
              dark
                ? "bg-white/15 text-white backdrop-blur"
                : "bg-lavender-200 text-lavender-900"
            }`}
          >
            {badge}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-bold">{title}</h3>
        <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-lavender-100" : "text-lavender-900/80"}`}>
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ctas.map((c) => (
            <span
              key={c.href}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                dark
                  ? "border border-white/30 bg-white/10 text-white"
                  : "border border-lavender-300 bg-white text-lavender-800"
              }`}
            >
              {c.label}
            </span>
          ))}
        </div>
        <p className={`mt-6 text-sm font-semibold ${dark ? "text-white" : "text-lavender-800"} group-hover:underline`}>
          Enter {badge.toLowerCase()} dashboard →
        </p>
      </div>
    </Link>
  );
}

function TechPill({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-lavender-100 bg-lavender-50/60 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-lavender-950">
        <span>{emoji}</span> {title}
      </p>
      <p className="mt-1 text-xs leading-snug text-lavender-900/80">{body}</p>
    </div>
  );
}
