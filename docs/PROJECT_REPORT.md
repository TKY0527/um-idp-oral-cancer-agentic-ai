# 📋 Project Report — Agentic AI for Oral Health Screening

> **University Integrated Design Project (IDP)**
> **Author:** TKY0527
> **Status:** Deployed & live

> ⚠️ Educational prototype — **not a medical device**. Every result carries a
> disclaimer to consult a qualified dentist or doctor.

---

## 1. Links

| | |
|---|---|
| 🌐 **Live app** | https://um-idp-oral-cancer-agentic-ai.vercel.app |
| 💻 **Source (GitHub)** | https://github.com/TKY0527/um-idp-oral-cancer-agentic-ai |
| 🤖 **Telegram bot** | https://t.me/Idporalbot |
| 📄 Methodology + citations | [docs/METHODOLOGY.md](METHODOLOGY.md) |
| 🧪 Teammate test guide | [docs/TEAMMATE_GUIDE.md](TEAMMATE_GUIDE.md) |

### Test accounts
| Username | Password | Role |
|----------|----------|------|
| test1 | test1 | Patient (teammate test account) |
| patient1 | patient1 | Patient |
| patient2 | patient2 | Patient |
| doctor | doctor | Doctor / clinician |

---

## 2. Overview

OralScan AI is a hierarchical **multi-agent AI** system that screens an oral
cavity image — plus a smart-toothbrush IoT telemetry simulation and a patient
questionnaire — for **oral cancer risk** and now also for everyday **dental
wellness** (cavities/蛀牙, gum disease, plaque, hygiene). It has a patient
dashboard, a clinician dashboard, a bilingual (English / Bahasa Malaysia) web
UI, and a Telegram bot — all backed by a shared cloud datastore so a clinician
sees every patient's screenings from any device.

---

## 3. Main user flows

**Patient (web or Telegram):** sign in → choose a sample case or upload/capture
an oral photo → answer a short health questionnaire → run the agentic screening
→ receive a risk band (Low/Medium/High), a multi-expert panel verdict, a dental
wellness assessment, a plain-language report, and a recommended next step. Can
upload previous reports and message the doctor.

**Clinician:** sign in → triage queue ordered by AI urgency (auto-refreshing,
labelled by patient + channel) → open a session for the full agent reasoning,
write a clinical note → browse all patients with their history, uploaded
reports, and a direct chat → view cohort analytics.

---

## 4. System architecture — the agents

A single **Orchestrator** drives the pipeline; each sub-agent has a narrow,
typed contract and its output is recorded in an audit log.

| Agent | Role |
|-------|------|
| **Orchestrator** | Owns the workflow, creates the session, writes the audit log |
| **Toothbrush IoT** | Simulates brushing telemetry (coverage, pressure, image quality) |
| **Vision Screening** | Pluggable provider (Gemini / Claude / Mock / future local model); auto-fallback |
| **Consensus** | Cross-checks two vision providers when enabled |
| **Cancer Risk Scoring** | 0–100 score from vision + questionnaire + telemetry (literature-calibrated) |
| **Multi-Expert Panel** | 3 role-prompted experts deliberate on Medium/High cases — Oral Pathologist (Claude Opus 4.7), Epidemiologist + General Dentist (Gemini 3.5 Flash) — synthesized by a Moderator |
| **RAG Retrieval** | Grounds the result in a cited oral-cancer knowledge base |
| **Patient Communication** | Plain-language patient report (never says "confirmed cancer") |
| **Clinician Referral** | Structured referral packet (High risk only) |
| **Triage Prioritization** | Urgency score + SLA for the doctor queue |
| **Dental Wellness** | Educational cavity (蛀牙) / gum / plaque / staining / hygiene assessment |

---

## 5. Feature list (implemented)

- ✅ Two role-based dashboards (patient, clinician) with login + access control
- ✅ Sign-in with signed-cookie sessions; 4 seeded accounts
- ✅ Screening via sample case, file upload, or live camera capture
- ✅ Animated multi-agent pipeline overlay (network graph, live timers)
- ✅ Literature-calibrated 0–100 risk score (IARC / INHANCE / NCCN — see methodology)
- ✅ Cross-LLM Multi-Expert Panel (Claude Opus 4.7 + Gemini 3.5 Flash)
- ✅ RAG-grounded explanations with citations
- ✅ **Multi-condition Dental Wellness** (cavities/蛀牙, gum disease, plaque, hygiene score)
- ✅ **Bilingual web UI** (English / Bahasa Malaysia) with persistent toggle
- ✅ **Patient report upload** (image/PDF) visible to the doctor
- ✅ Doctor sees **all** patients' screenings + Telegram sessions across devices
- ✅ Doctor ↔ patient secure messaging
- ✅ Cohort analytics + AI/clinician agreement
- ✅ **Telegram bot** (@Idporalbot) — bilingual, photo → screening → report, results sync to the doctor dashboard
- ✅ Full audit log per session
- ✅ Mandatory medical disclaimers throughout

---

## 6. Technology

- **Frontend/Backend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind CSS
- **AI:** Google Gemini 3.5 Flash (vision + experts + chat), Anthropic Claude Opus 4.7 (pathologist expert), mock provider fallback
- **Storage:** Upstash Redis (Vercel KV) via REST; in-memory fallback for local dev
- **Auth:** Web-Crypto HMAC signed-cookie sessions, role-based middleware
- **Bot:** fetch-based Telegram client; webhook (Vercel) + polling (local), shared handler
- **Hosting:** Vercel (auto-deploy from GitHub `main`)

---

## 7. Engineering quality

- **Build:** clean (25 routes, 0 TypeScript errors)
- **Reviewed by multi-agent workflows:**
  - Adversarial code review (5 dimensions, 20 findings, 8 confirmed & fixed before launch — auth gates, atomic KV ops, webhook idempotency)
  - 4-persona UX/feature brainstorm (patient, clinician, accessibility, product) → drove the bilingual + dental wellness + report-upload features
- **Security:** API routes require auth; secrets never committed to GitHub (`.env.local` gitignored, verified); patient data isolation enforced; doctor-only routes gated.

---

## 8. Safety & ethics

- Every result is wrapped with: *"This prototype is not a medical diagnosis…"*
- Poor image quality caps the risk score (no confident "High" from a blurry frame)
- The Vision agent is prompted to never claim certainty
- No real patient data; sample cases are illustrative SVGs
- Dental Wellness is explicitly educational, not diagnostic

---

## 9. Future work

- Custom-trained oral cancer model replacing the hosted vision API (scaffolded in `/training`)
- Larger-font accessibility mode + first-run consent modal (flagged by UX audit)
- Deeper Bahasa Malaysia coverage of medical body text
- Per-patient risk timeline / cross-session comparison
- Systemic-disease flags (diabetes, immunosuppression) in scoring

---

## 10. How it was built

Developed iteratively with Claude Code: scaffolding → 10-agent pipeline →
literature-grounded scoring → Telegram bot → multi-user auth + cloud storage →
Vercel deployment → bilingual + multi-condition + report-upload — each phase
adversarially reviewed by background multi-agent workflows before shipping.
