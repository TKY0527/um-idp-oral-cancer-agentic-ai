# Agentic AI for Oral Cancer Screening using a Smart Toothbrush IoT Concept

A university **Integrated Design Project (IDP)** prototype that demonstrates a
hierarchical multi-agent AI system for oral cancer screening. The vision step is
pluggable: it can use **Gemini Vision**, **Claude Vision**, a fully **offline mock
provider**, or a **future custom-trained model** served via FastAPI — all behind
the same agent contract.

> ⚠️ **This prototype is not a medical diagnosis. It is an educational oral
> cancer screening demonstration. Please consult a qualified dentist or doctor
> for proper diagnosis.**

---

## 1. Screenshot

> _Add a screenshot of the running app here once the team has captured one._
>
> Suggested path: `docs/screenshot.png`

---

## 2. Medical safety disclaimer

This software is built **for university coursework demonstration only**. It is
not a medical device, has not been clinically validated, does not store patient
data, and must never be used to make health decisions. The Vision Screening
Agent is explicitly prompted to never claim certainty, the Risk Scoring Agent
caps the score at 55 when image quality is poor, the Patient Communication
Agent never says "confirmed cancer", and every result is wrapped with the
mandatory disclaimer above.

---

## 3. System architecture

The system follows a **hierarchical multi-agent** pattern. The Orchestrator is
the only agent that knows the full pipeline; every other agent has a narrow,
typed contract.

```
       ┌─────────────────────────────────────────────────────────┐
       │  User                                                   │
       │   • picks a sample case OR uploads an oral cavity photo │
       │   • fills the risk questionnaire                        │
       │   • picks a vision provider (mock / gemini / claude)    │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
                   ┌────────────────────────────────┐
                   │     Orchestrator Agent         │
                   │  • creates session id          │
                   │  • drives pipeline             │
                   │  • writes audit log            │
                   └─┬──────┬────────┬─────────┬────┘
                     │      │        │         │
        ┌────────────▼─┐ ┌──▼─────┐ ┌▼───────┐ ┌▼──────────────────┐
        │ Toothbrush   │ │ Vision │ │ Cancer │ │ Patient           │
        │ IoT Agent    │ │ Screen.│ │ Risk   │ │ Communication     │
        │ (telemetry)  │ │ Agent  │ │ Scoring│ │ Agent             │
        └──────────────┘ └────────┘ └────────┘ └─────────┬─────────┘
                                                          │
                                       ┌──────────────────▼──────────────────┐
                                       │  Clinician Referral Agent           │
                                       │  (only when risk level is High)     │
                                       └─────────────────────────────────────┘
```

The Vision Screening Agent calls **one of four pluggable providers**:

| Provider | When it's used | Module |
|----------|----------------|--------|
| `mock`   | Default. Works offline, no key needed. | [lib/visionProviders/mockVisionProvider.ts](lib/visionProviders/mockVisionProvider.ts) |
| `gemini` | If `GEMINI_API_KEY` is set | [lib/visionProviders/geminiVisionProvider.ts](lib/visionProviders/geminiVisionProvider.ts) |
| `claude` | If `ANTHROPIC_API_KEY` is set | [lib/visionProviders/claudeVisionProvider.ts](lib/visionProviders/claudeVisionProvider.ts) |
| `local`  | If `LOCAL_MODEL_ENDPOINT` is set (future custom-trained model) | [lib/visionProviders/localModelProvider.ts](lib/visionProviders/localModelProvider.ts) |

**Automatic fallback:** if the requested provider is missing credentials or
fails at runtime, the agent transparently falls back to mock and records the
reason in the audit log — the app **never crashes**.

---

## 4. Agent responsibilities

| Agent | Responsibility | Source |
|-------|---------------|--------|
| **Orchestrator** | Owns the workflow, creates the session id, calls every other agent in order, builds the audit log. | [lib/agents/orchestratorAgent.ts](lib/agents/orchestratorAgent.ts) |
| **Toothbrush IoT** | Simulates smart-toothbrush telemetry: brushing duration, pressure, motion blur, image quality, coverage, session validity, rescan recommendation. | [lib/agents/toothbrushIoTAgent.ts](lib/agents/toothbrushIoTAgent.ts) |
| **Vision Screening** | Calls one of four pluggable vision providers and returns a structured `VisionResult`. Falls back to mock on failure. | [lib/agents/visionScreeningAgent.ts](lib/agents/visionScreeningAgent.ts) |
| **Cancer Risk Scoring** | Combines the vision finding, the questionnaire, and the toothbrush quality into a 0–100 score with a Low/Medium/High band and a transparent driver list. | [lib/agents/cancerRiskScoringAgent.ts](lib/agents/cancerRiskScoringAgent.ts) |
| **Patient Communication** | Translates the technical result into a calm, plain-language patient report — never says "confirmed cancer". | [lib/agents/patientCommunicationAgent.ts](lib/agents/patientCommunicationAgent.ts) |
| **Clinician Referral** | Builds a structured referral packet for a dentist / oral medicine specialist. Generated **only** when risk is High. | [lib/agents/clinicianReferralAgent.ts](lib/agents/clinicianReferralAgent.ts) |

---

## 5. Vision provider modes

| Mode | Cost | Internet | Best for |
|------|------|----------|----------|
| `mock`   | Free | ❌ | IDP demo, fastest, deterministic per upload |
| `gemini` | Free tier on Google AI Studio | ✅ | Real Vision API showcase |
| `claude` | Paid (Anthropic) | ✅ | Higher-quality reasoning |
| `local`  | Free (your own GPU) | ❌ | Final phase — custom-trained model |

The user picks the provider in the UI at run-time. The default fallback comes
from `VISION_PROVIDER` in `.env.local`.

---

## 6. Run the app

### 6.1 Prerequisites

- **Node.js 18+** (this project was scaffolded on Node 24).
- **npm** (ships with Node).
- A modern browser.

### 6.2 Install

```bash
npm install
```

### 6.3 Mock mode (no key, works offline)

```bash
npm run dev
```

Open <http://localhost:3000>, pick a sample case, click **Run Agentic AI Screening**.

### 6.4 Gemini Vision mode

1. Get a free key at <https://aistudio.google.com/apikey>.
2. In `.env.local`:
   ```env
   GEMINI_API_KEY=YOUR_KEY_HERE
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Restart `npm run dev`.
4. In the UI, pick **Gemini Vision** under "Run agentic AI screening", then upload an image.

> Sample cases use a pre-defined finding (no live API call) so the pipeline
> stays deterministic in demos. **Uploaded images** are the ones sent to Gemini.

### 6.5 Claude Vision mode

1. Get a key at <https://console.anthropic.com>.
2. In `.env.local`:
   ```env
   ANTHROPIC_API_KEY=YOUR_KEY_HERE
   CLAUDE_MODEL=claude-sonnet-4-5
   ```
3. Restart `npm run dev` and pick **Claude Vision** in the UI.

### 6.6 Build for production

```bash
npm run build
npm run start
```

### 6.7 Type-check

```bash
npm run typecheck
```

---

## 7. Optional: deploy on Vercel

The app is Vercel-ready (no server-state, no DB).

1. Push this repo to GitHub.
2. On <https://vercel.com>, click **Add New → Project** and import the repo.
3. Set environment variables in **Settings → Environment Variables**:
   - `VISION_PROVIDER` (e.g. `mock`, `gemini`, or `claude`)
   - `GEMINI_API_KEY` (if using Gemini)
   - `ANTHROPIC_API_KEY` (if using Claude)
4. Deploy.

You can also leave Vercel out and just use the GitHub repo — the project runs
locally with `npm run dev`.

---

## 8. Dataset note

**No real patient data is shipped with this repository.** The 4 sample cases are
illustrative SVGs with hand-coded findings, designed for the IDP demo. The real
dataset for the future custom model **must not** be committed to GitHub — see
[training/dataset_structure.md](training/dataset_structure.md). The `.gitignore`
already excludes `data/`, `models/`, and common model checkpoint formats.

---

## 9. Future custom model training

The vision step is designed to be swapped for a custom-trained classifier in
the next phase of the project:

- Dataset layout: [training/dataset_structure.md](training/dataset_structure.md)
- Training script skeleton: [training/future_train_model.py](training/future_train_model.py)
- FastAPI serving skeleton: [training/future_fastapi_model_server.py](training/future_fastapi_model_server.py)
- Roadmap: [training/README.md](training/README.md)

To switch the live app to the custom model:

```env
VISION_PROVIDER=local
LOCAL_MODEL_ENDPOINT=http://localhost:8000/predict
```

The Vision Screening Agent will route every screening through the FastAPI
endpoint without any other code change.

---

## 10. Folder structure

```
.
├── app/
│   ├── api/
│   │   └── screening/
│   │       └── route.ts          # POST endpoint that drives the pipeline
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Main dashboard UI
├── components/                   # 14 React components
│   ├── AgentPipeline.tsx
│   ├── ArchitectureExplainer.tsx
│   ├── AuditLogPanel.tsx
│   ├── ClinicianReferralCard.tsx
│   ├── HeroSection.tsx
│   ├── ImageUpload.tsx
│   ├── PatientReportCard.tsx
│   ├── ProviderStatusBadge.tsx
│   ├── QuestionnaireForm.tsx
│   ├── RiskScoreCard.tsx
│   ├── SafetyBanner.tsx
│   ├── SampleCaseSelector.tsx
│   ├── ToothbrushTelemetryCard.tsx
│   └── VisionResultCard.tsx
├── lib/
│   ├── agents/                   # 6 agents
│   │   ├── orchestratorAgent.ts
│   │   ├── toothbrushIoTAgent.ts
│   │   ├── visionScreeningAgent.ts
│   │   ├── cancerRiskScoringAgent.ts
│   │   ├── patientCommunicationAgent.ts
│   │   └── clinicianReferralAgent.ts
│   ├── visionProviders/          # 4 pluggable providers
│   │   ├── mockVisionProvider.ts
│   │   ├── geminiVisionProvider.ts
│   │   ├── claudeVisionProvider.ts
│   │   └── localModelProvider.ts
│   ├── data/
│   │   └── sampleCases.ts        # 4 built-in demo cases
│   ├── types/
│   │   └── screening.ts          # Shared TypeScript contracts
│   └── utils/
│       └── riskUtils.ts
├── public/
│   └── samples/                  # 4 SVG illustrations
├── training/                     # Planning for future custom model
│   ├── README.md
│   ├── dataset_structure.md
│   ├── future_train_model.py
│   └── future_fastapi_model_server.py
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 11. Commands

```bash
npm install         # one-time
npm run dev         # local development server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # TypeScript-only check
```

---

## 12. License & credits

University IDP prototype. Educational use only — not a medical device.
