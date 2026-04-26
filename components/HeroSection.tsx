export function HeroSection() {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-lavender-200 bg-gradient-to-br from-lavender-100 via-white to-lavender-50 p-8 shadow-card">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lavender-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-lavender-200/50 blur-3xl" />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lavender-300 bg-white/70 px-3 py-1 text-xs font-medium text-lavender-800 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-lavender-500" />
          University IDP · Agentic AI Prototype
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-lavender-950 sm:text-4xl">
          Agentic AI for Oral Cancer Screening
        </h1>
        <p className="mt-1 text-lg text-lavender-800">
          Smart Toothbrush IoT Concept — Multi-agent screening demonstration
        </p>
        <p className="mt-4 max-w-3xl text-sm text-lavender-900/80">
          A hierarchical multi-agent system orchestrates a simulated smart-toothbrush sensor pod,
          a vision screening provider (Gemini / Claude / Mock / Future Local Model), an oral cancer
          risk scoring engine, a patient communication layer, and a clinician referral generator —
          all with a transparent audit trail.
        </p>
      </div>
    </header>
  );
}
