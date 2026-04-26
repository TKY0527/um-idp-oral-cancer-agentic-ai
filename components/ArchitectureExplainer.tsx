export function ArchitectureExplainer() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Panel
        icon="🧠"
        title="How the Agentic AI System Works"
      >
        <p>
          A hierarchical multi-agent design. The <b>Orchestrator</b> drives the workflow and is the
          only agent that knows the full pipeline. It calls a <b>Toothbrush IoT</b> agent
          (telemetry), a <b>Vision Screening</b> agent (Mock / Gemini / Claude / Local), a{" "}
          <b>Cancer Risk Scoring</b> agent, a <b>Patient Communication</b> agent, and — only when
          risk is High — a <b>Clinician Referral</b> agent.
        </p>
        <p>
          Each agent has a narrow, well-defined contract. Their inputs and outputs are typed and
          recorded in the audit log so the entire decision is reproducible.
        </p>
      </Panel>

      <Panel
        icon="🛡️"
        title="Why this is screening support, not diagnosis"
      >
        <p>
          The system produces a prototype <i>oral cancer-like screening risk</i>, not a medical
          diagnosis. It is intentionally cautious:
        </p>
        <ul className="mt-2 list-disc pl-4">
          <li>The Vision agent is prompted to never claim certainty.</li>
          <li>Poor image quality caps the risk score at 55 — no high-risk verdict from a blurry frame.</li>
          <li>Every result is wrapped with a mandatory disclaimer.</li>
          <li>Patient-friendly language never says &quot;cancer confirmed&quot;.</li>
        </ul>
      </Panel>

      <Panel
        icon="🚀"
        title="Future: replace Vision API with custom-trained model"
      >
        <p>
          Today the Vision Screening Agent uses a hosted vision model (Gemini / Claude) or the
          mock provider. In the next phase a custom oral-cancer classifier will be trained
          (transfer learning on MobileNetV3 / EfficientNet) and served via FastAPI.
        </p>
        <p>
          Swapping providers is one config change: set <code>VISION_PROVIDER=local</code> and{" "}
          <code>LOCAL_MODEL_ENDPOINT=http://localhost:8000/predict</code>. See <code>/training</code>{" "}
          for the planned dataset structure and training script skeleton.
        </p>
      </Panel>
    </section>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">{title}</h3>
      </div>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-lavender-900/85">
        {children}
      </div>
    </article>
  );
}
