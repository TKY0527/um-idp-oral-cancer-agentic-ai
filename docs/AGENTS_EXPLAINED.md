# 🧠 What each AI agent does & what its card shows

A demo cheat-sheet mapping every agent in the pipeline to the result card it
produces. Order = the order the Orchestrator runs them.

> Educational prototype — not a medical device. Every result carries a "consult
> a dentist/doctor" disclaimer.

---

### 0. 🧩 Orchestrator Agent — *(no card; drives everything)*
**Does:** Creates the session, calls every agent in order, records every step.
**Shown by:** the animated **Agent Pipeline** overlay (live) + the **Audit Log**.
**Demo line:** "One orchestrator coordinates 11 specialised agents — it's the only one that knows the whole workflow."

### 1. 🪥 Toothbrush IoT Agent → **Smart Toothbrush Telemetry** card
**Does:** Simulates the smart-toothbrush sensor pod that captured the image.
**Card shows:** brushing duration (90–179 s), pressure (low/normal/high), motion-blur score, image-quality score, coverage %, session valid (yes/no), and a note on whether quality is good enough.
**Demo line:** "The IoT layer reports how good the capture was — poor quality later caps the risk score."

### 2. 👁️ Vision Screening Agent → **Vision Screening Result** card
**Does:** Sends the image to a pluggable provider (Gemini / Claude / Mock / future local) and auto-falls-back to Mock if a key is missing or a call fails.
**Card shows:** image-quality badge (green/amber/red), the **visual finding** (e.g. "Red patch-like area"), suspected **region**, two bars — **oral-cancer-like probability** and **model confidence** — an observation summary, and a disclaimer.
**Demo line:** "Real Gemini 3.5 Flash looks at the image and returns a structured finding + probability — never a diagnosis."

### 3. 🤝 Consensus Agent → **Consensus Panel** *(only when 2 providers are enabled)*
**Does:** Runs a second vision provider and compares it to the first.
**Card shows:** agreement level + score between the two models, side-by-side findings.
**Demo line:** "Optional second opinion — two different LLMs cross-check each other instead of trusting one."

### 4. 📊 Cancer Risk Scoring Agent → **Oral Cancer Risk Score** card
**Does:** Combines vision finding + questionnaire + image quality into a **0–100** score with a Low/Medium/High band — using literature-calibrated weights (IARC, INHANCE, NCCN).
**Card shows:** a colour-coded **circular ring** (green/amber/red) with the number, the risk **band** badge, **confidence** level, the **top 5 risk drivers** (with weights + citations, e.g. "Tobacco use (+18, IARC Monograph 100E)"), and a plain explanation.
**Demo line:** "The score isn't guessed by an LLM — it's a transparent, cited formula. Bands: 0–29 Low, 30–59 Medium, 60–100 High."

### 5. 🧑‍⚕️ Multi-Expert Panel → **Multi-Expert Panel** card *(auto-triggers on Medium/High)*
**Does:** Three role-prompted experts deliberate **in parallel**: Oral Pathologist (**Claude Opus 4.7**), Epidemiologist (**Gemini 3.5 Flash**), General Dentist (**Gemini 3.5 Flash**).
**Card shows:** 3 columns — each with the expert's LLM badge, confidence, their finding, estimated probability, a colour-coded **recommended action** (reassure → watchful wait → monitor 2 wks → urgent referral → biopsy), reasoning, key concerns, and "questions this expert would ask".
**Demo line:** "It's a real cross-LLM tumour-board — Claude and Gemini argue the case from three professional angles."

### 6. 📋 Moderator → **Moderator Verdict** card
**Does:** Deterministically synthesises the 3 opinions (no LLM, fully reproducible).
**Card shows:** consensus status (**Strong agreement ≥85% / Majority ≥55% / Split**) with %, the final finding (majority vote, confidence tiebreak), a confidence-weighted probability, an **escalation decision** (⬆ escalate / ≈ keep / ⬇ downgrade vs the rule-based band), a **vote-distribution bar chart**, and any dissent.
**Demo line:** "The moderator counts the votes, takes the safest action, and tells you if the panel wants to escalate beyond the rule-based score."

### 7. 📚 RAG Retrieval Agent → **Knowledge grounding (RAG)** panel
**Does:** Keyword-matches the case against a 10-entry cited oral-cancer knowledge base and ranks the top 3.
**Card shows:** each snippet's **title**, a **relevance %** badge, the excerpt, and the **source citation** (author/year).
**Demo line:** "Every result is grounded in cited references — not the LLM's memory."

### 8. 💬 Patient Communication Agent → **Patient-friendly Report** card
**Does:** Rewrites the technical result into calm, plain language. Never says "confirmed cancer"; always includes the disclaimer.
**Card shows:** a **headline**, a reassuring **message**, **what was observed**, **why this risk level**, a **recommended next step**, the risk badge, and the disclaimer. (In patient view the technical citations are hidden.)
**Demo line:** "The same result, translated into language a worried patient can actually understand."

### 9. 🪥 Dental Wellness Agent → **Dental Wellness — beyond cancer** card
**Does:** A deterministic educational check (no LLM) for everyday dental issues, derived from telemetry + questionnaire + visual cues.
**Card shows:** a **hygiene score ring (0–100)** and four chips — **Cavity (蛀牙)**, **Gums**, **Plaque**, **Staining** — plus up to 5 personalised tips and a disclaimer.
**Demo line:** "It's not only cancer — the app also gives an everyday cavity / gum / hygiene check."

### 10. 🩺 Clinician Referral Agent → **Clinician Referral Packet** *(High risk only)*
**Does:** Builds a structured hand-off for a dentist / oral-medicine specialist — only when risk ≥ 60 (High).
**Card shows:** a summary, risk score + drivers, visual finding, region, questionnaire summary, toothbrush session quality, a **suggested clinician action**, and a disclaimer (red-bordered card).
**Demo line:** "On a high-risk case it auto-drafts the referral letter the dentist would otherwise type by hand."

### 11. 🚦 Triage Prioritization Agent → *(doctor queue + session sidebar)*
**Does:** Computes an **urgency score** and a recommended **SLA** (review-by hours).
**Shown by:** the position/urgency in the **doctor triage queue** and the session sidebar.
**Demo line:** "The doctor's queue is auto-sorted by AI urgency, so the most concerning patient is always on top."

### 12. 📜 Audit Log (written by the Orchestrator) → **Audit Log** panel
**Does:** Records every agent call, fallback, and result with a timestamp.
**Card shows:** a timestamped list of `time · agent · event · detail` for the whole session.
**Demo line:** "Full transparency — you can replay exactly how the result was produced."

---

## One-sentence pitch
> "A single orchestrator runs **11 specialised agents** — IoT telemetry, a real cross-LLM vision + expert panel, a cited risk score, a plain-language patient report, an everyday dental-wellness check, and an auto-drafted referral — every step **logged and reproducible**, every result clearly labelled *not a diagnosis*."
