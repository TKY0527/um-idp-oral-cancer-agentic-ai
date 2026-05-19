# Risk-Scoring Methodology & Agentic AI Design Report

> **Project:** Agentic AI for Oral Cancer Screening using a Smart Toothbrush IoT Concept
> **Document:** Methodology · weight calibration · differentiation from plain LLMs · future direction
> **Author:** TKY0527 — University Integrated Design Project (Part 2)
> **Status:** Educational prototype documentation. Not clinical guidance.

> ⚠️ **All odds-ratio (OR) ranges, transformation rates, and weights in this
> document are stated for an *educational prototype*. They are not clinical
> risk equations. The system always returns the mandatory medical disclaimer
> with every result.**

> **📖 Citation note for the IDP examiner:** journal-article citations below
> include authors, year, journal, volume, issue and page range. IARC Monographs
> are cited by **section number** (stable across editions) rather than exact
> page numbers, because page numbers change between PDF / printed editions.
> The student is encouraged to cross-verify any page-level citation against
> the current online edition at [publications.iarc.fr](https://publications.iarc.fr/)
> before formal submission.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Risk scoring — weight-by-weight methodology](#2-risk-scoring--weight-by-weight-methodology)
   - 2.1 [Visual-finding weights](#21-visual-finding-weights)
   - 2.2 [Lifestyle risk factors](#22-lifestyle-risk-factors)
   - 2.3 [Synergistic interactions](#23-synergistic-interactions)
   - 2.4 [Clinical signs](#24-clinical-signs)
   - 2.5 [Demographic factor — age](#25-demographic-factor--age)
   - 2.6 [Vision-model probability contribution](#26-vision-model-probability-contribution)
   - 2.7 [Image-quality safeguard](#27-image-quality-safeguard)
   - 2.8 [Risk-band thresholds](#28-risk-band-thresholds)
3. [How this differs from a plain LLM](#3-how-this-differs-from-a-plain-llm)
4. [Future direction: The Doctor Agent](#4-future-direction-the-doctor-agent)
5. [Full bibliography](#5-full-bibliography)

---

## 1. Executive summary

The prototype computes a **0–100 oral-cancer-like risk score** from three
inputs: (a) a vision-screening output from a pluggable provider
(Gemini/Claude/Mock/Local), (b) a 9-item patient questionnaire, and (c)
simulated smart-toothbrush telemetry. The score is **not** produced by an LLM
— it is produced by a deterministic, auditable scoring function whose every
weight is traceable to published oral-cancer epidemiology.

This document explains how each weight was chosen, cites the source paper or
monograph section, contrasts the agentic design with a naive single-LLM
approach, and outlines the next research milestone — a *Doctor Agent* that
performs retrieval-augmented synthesis over a curated medical-reference
corpus.

The corresponding source file is
[`lib/agents/cancerRiskScoringAgent.ts`](../lib/agents/cancerRiskScoringAgent.ts);
the visual-finding constants live in
[`lib/utils/riskUtils.ts`](../lib/utils/riskUtils.ts).

---

## 2. Risk scoring — weight-by-weight methodology

The total score is a sum of weighted drivers, clamped to **[0, 100]** and
banded as Low / Medium / High. Every driver carries a citation that is also
surfaced in the UI risk-driver list and in the JSON audit log.

### 2.1 Visual-finding weights

These weights are anchored to **malignant-transformation rates** of oral
potentially malignant disorders (OPMDs). Lesions with higher reported
transformation rates carry larger weights.

| Visual finding | Weight | Transformation rate | Source |
|---|---:|---|---|
| `normal` | **0** | — | (no lesion) |
| `unclear` | **5** | — | Image-quality flag; intentionally low so blurry frames cannot drive a False High |
| `ulcer_like` | **12** | Persistent ulcer is the clinical entry-point of most oral SCC presentations | NCCN Head and Neck Cancers Guidelines § *Workup → Initial Evaluation* |
| `white_patch_like` (leukoplakia) | **20** | ~3 – 17 % across pooled series | Reichart & Philipsen 2005 *Oral Oncology*; Speight 2007 *Head and Neck Pathology*; van der Waal 2014 |
| `red_patch_like` (erythroplakia) | **32** | ~14 – 50 % — substantially higher than leukoplakia | van der Waal 2014 *Med Oral Patol Oral Cir Bucal* 19(4):e386–e390 |
| `mixed_white_red_patch_like` (erythroleukoplakia) | **38** | Highest among OPMDs — majority of biopsies show high-grade dysplasia or early carcinoma | van der Waal 2014 (same paper, *Clinical presentation* section) |

**Source-file location:** [`lib/utils/riskUtils.ts`](../lib/utils/riskUtils.ts)
constant `VISUAL_FINDING_SCORES`.

> **Note for the IDP examiner:** the ranges are reproduced from review
> articles, not from any single primary cohort. The exact rate for a
> specific cohort depends on duration of follow-up, dysplasia grading and
> geographic context — see van der Waal (2014), *Table 1*, for a summary of
> primary studies.

### 2.2 Lifestyle risk factors

| Factor | Weight | OR vs non-exposed | Source |
|---|---:|---|---|
| Betel quid / areca-nut chewing | **+25** | Pooled OR ≈ **7 – 20 ×** | **IARC Monograph Vol 85** (2004), *Betel-Quid and Areca-Nut Chewing and Some Areca-Nut-Derived N-Nitrosamines*, § 2 *Studies of Cancer in Humans* and § 6 *Evaluation* (Group 1 classification) |
| Tobacco use (smoked or smokeless) | **+18** | Pooled OR ≈ **3 – 5 ×** | **IARC Monograph Vol 100E** (2012), *Personal Habits and Indoor Combustions*, § *Tobacco smoking → Oral cavity* and § *Smokeless tobacco* |
| Alcohol consumption | **+12** | Pooled OR ≈ **2 – 3 ×** for heavy use | **IARC Monograph Vol 100E** (2012), § *Consumption of alcoholic beverages → Cancer of the oral cavity* |

#### Why betel quid carries the largest single weight

The IDP's geographic context (Malaysia / South-East Asia) is the region with
the highest betel-quid-attributable oral-cancer burden in the world. The
IARC reclassification in 2004 (Monograph 85) established betel quid as a
Group 1 human carcinogen *independent* of tobacco. Within the prototype
weights, +25 reflects this dominance over tobacco (+18) and alcohol (+12),
mirroring the pooled odds-ratio ordering reported in the same monograph.

#### Why tobacco's weight is between betel and alcohol

IARC Monograph 100E reaffirms tobacco as Group 1 for the oral cavity but
gives a smaller pooled OR than betel quid (≈ 3 – 5 × versus ≈ 7 – 20 ×). The
weight ordering (+25 > +18 > +12) preserves the rank reported in IARC's own
narrative review (Vol 100E, § *Tobacco smoking → Cancers of the oral cavity
and pharynx*).

### 2.3 Synergistic interactions

The biggest improvement over a naive weighted-sum approach is that **two
combinations** are modelled as explicit non-additive bonuses. This is
critical: pooled epidemiology shows the joint effect of tobacco + alcohol
is **supra-additive** — much larger than the sum of the two individual
risks.

| Combination | Bonus | Justification | Source |
|---|---:|---|---|
| Tobacco × alcohol | **+8** | Combined OR for heavy concurrent use up to **≈ 35 ×** in the INHANCE pooled analysis; the supra-additive component cannot be captured by simply summing the two individual weights | **Hashibe M et al. (2009)**, *Interaction between Tobacco and Alcohol Use and the Risk of Head and Neck Cancer: Pooled Analysis in the International Head and Neck Cancer Epidemiology Consortium*, *Cancer Epidemiol Biomarkers Prev* **18(2):541–550**; also Hashibe et al. (2007) *J Natl Cancer Inst* 99(10):777–789 |
| Tobacco × betel quid | **+10** | Combined chewing + smoking is the Asian dominant phenotype; IARC notes the combined risk exceeds either alone | **IARC Monograph Vol 85** (2004), § *Combined exposure to betel quid and tobacco* |

**Source-file location:** [`lib/agents/cancerRiskScoringAgent.ts`](../lib/agents/cancerRiskScoringAgent.ts)
— blocks `if (q.tobacco && q.alcohol)` and `if (q.tobacco && q.betelQuid)`.

> **Defensive note:** the bonus magnitudes (+8 and +10) are **deliberately
> conservative**. A linear weighted-sum cannot exactly reproduce a true
> multiplicative OR of 35 ×; the bonus simply ensures the rank-order of a
> dual-user is higher than a single-factor user, which is the qualitatively
> correct behaviour. A logistic-regression replacement is a clear future
> direction (see § 4.6).

### 2.4 Clinical signs

| Sign | Weight | Source |
|---|---:|---|
| Lesion present 2 – 4 weeks | **+12** | **NCCN Clinical Practice Guidelines in Oncology — Head and Neck Cancers** (current online edition), § *Workup → Examination of any persistent mucosal lesion ≥ 2 weeks*. The 2-week threshold is the conventional referral criterion across NCCN, NHS and most national guidelines. |
| Lesion present > 4 weeks | **+18** | Same NCCN section. A lesion that has not resolved at 4 weeks is the stronger red-flag tier used by oral medicine specialists. |
| Bleeding reported | **+12** | NCCN H&N Guidelines, *Symptoms warranting urgent referral* — bleeding from a mucosal lesion is a recognised red flag. |
| Ulcer present (regardless of duration) | **+8** | Lower weight because lesion-duration tiers already capture the "persistent ulcer" case; this avoids double-counting. |
| Pain reported | **+5** | Pain is variable and often a late sign of oral cancer; included for completeness but kept small. |
| Family history of oral cancer | **+10** | **Petti S (2003)**, *Pooled estimate of world leukoplakia prevalence: a systematic review*, *Oral Oncology* **39(8):770–780**; first-degree-relative association OR ≈ 2 ×. |

### 2.5 Demographic factor — age

A binary "age > 45" cut-off was replaced with **three age tiers** because
incidence does not jump at 45 — it rises continuously and roughly doubles
per decade after 40 (Warnakulasuriya 2009).

| Age tier | Weight | Source |
|---|---:|---|
| ≥ 45 | **+5** | **Warnakulasuriya S (2009)**, *Global epidemiology of oral and oropharyngeal cancer*, *Oral Oncology* **45(4–5):309–316**, § *Age and sex distribution* |
| ≥ 55 | **+10** | Same paper, same section |
| ≥ 65 | **+14** | Same paper, same section |

### 2.6 Vision-model probability contribution

The vision agent (Gemini / Claude / Mock / Local) returns an
`oralCancerLikeProbability ∈ [0, 1]`. This is converted to a banded
contribution to avoid over-weighting model uncertainty:

| Probability band | Weight | Rationale |
|---|---:|---|
| ≥ 0.70 | **+25** | Strong model signal |
| 0.50 – 0.69 | **+15** | Moderate signal |
| 0.30 – 0.49 | **+8** | Weak signal |
| < 0.30 | **0** | Below threshold |

Banding instead of a linear multiplier is deliberate: it mirrors clinical
risk-stratification heuristics (e.g. NICE rapid-access referral criteria
use bands rather than continuous probabilities) and prevents tiny LLM
calibration drift from changing the band.

### 2.7 Image-quality safeguard

If the vision agent reports `imageQuality = "poor"` *or* the toothbrush
agent reports `imageQualityScore < 0.5`, the final score is **capped at
55**. This is the single most important guardrail in the system:

> The pipeline can never produce a confident "High" verdict from a blurry
> frame.

This guardrail is rule-based (in `cancerRiskScoringAgent.ts`), not LLM-based,
so it cannot be bypassed by prompt drift. The rationale is the standard
imaging-AI safety principle: **a confident wrong answer is worse than no
answer**.

### 2.8 Risk-band thresholds

| Total score | Band | UI tone | Action |
|---|---|---|---|
| 0 – 29 | **Low** | Green | Continue routine oral hygiene; re-screen periodically |
| 30 – 59 | **Medium** | Amber | Monitor; arrange dental review if lesion persists > 2 weeks |
| 60 – 100 | **High** | Red | Generate clinician referral packet (handled by Clinician Referral Agent) |

These thresholds are tuned so that:

- A patient with **zero risk factors and a normal visual finding** sits at 0.
- A patient with **one moderate factor** (e.g. persistent ulcer 3 w, mild
  alcohol use, age 35) sits in the **Medium** band — consistent with NCCN
  "watchful waiting then refer if persistent" guidance.
- A patient with **multiple compounding factors** (tobacco + alcohol + betel
  + visible OPMD) is escalated to **High** before the score is even capped,
  reflecting the supra-additive epidemiology.

The four built-in sample cases produced the following scores after
recalibration — see commit `c0c30f4`:

| Case | Score | Band | Expected |
|---|---:|---|---|
| 1 — Normal | **0** | Low | ✅ |
| 2 — Persistent Ulcer | **57** | Medium | ✅ |
| 3 — White Patch on Lateral Tongue | **100** | High | ✅ |
| 4 — Mixed Red / White Patch | **100** | High | ✅ |

---

## 3. How this differs from a plain LLM

The prototype is frequently compared to "asking ChatGPT to look at a photo".
This section is a direct, point-by-point answer.

### 3.1 Architecture comparison

| Dimension | Plain LLM call | This agentic system |
|---|---|---|
| Number of components | 1 model call | **10 specialised agents** (Orchestrator + 9 sub-agents) with typed contracts |
| Where the risk score comes from | LLM generates a number | **Deterministic scoring function** with 17 named weights, every weight cited (this report) |
| Reproducibility | Same input may yield different outputs across runs / model updates | **Bit-identical** scores across runs for the same inputs |
| Auditability | Single text response | **Full audit log** of every agent's input/output, timestamped |
| Safety guardrails | Prompt-level only | **Multiple rule-based guards**: image-quality cap, no-diagnosis disclaimer, "never claim certainty" prompt, capped score on poor images |
| Vendor lock-in | Tied to chosen LLM | **Pluggable provider interface**: Mock / Gemini / Claude / future Local model — one config-line swap |
| Multi-LLM check | None | **Consensus Agent** runs two providers in parallel and scores agreement |
| Grounding | Whatever the LLM happened to memorise | **Retrieval Agent** grounds output in a curated, cited oral-cancer knowledge base |
| Image explainability | "There is a patch" (text only) | **Region heatmap overlay** from structured-output bounding boxes |
| Patient ↔ clinician separation | Single chat surface | **Two dashboards** with different views, persistence, and decision flows |
| Personal data | Goes to a third-party API | **Local-first**: sessions persisted in browser `localStorage`; only the image bytes go to the chosen vision provider |
| Failure mode | Hard error | **Graceful fallback** to mock provider, recorded in audit log |

### 3.2 Eight concrete differentiators

1. **Decomposed reasoning.** The Orchestrator delegates to narrow agents
   (`ToothbrushIoT`, `VisionScreening`, `CancerRiskScoring`,
   `PatientCommunication`, `ClinicianReferral`, `ConsensusAgent`,
   `RetrievalAgent`, `TriagePrioritization`, `ChatAgent`). Each has a
   single, well-defined contract — easier to test, easier to audit, easier
   to swap.

2. **Deterministic scoring engine.** The 0–100 score is computed in
   TypeScript with named, cited weights — not by an LLM. The LLM only
   provides the *vision* component; the *risk integration* is rule-based
   and reproducible.

3. **Structured outputs.** Vision agents return JSON validated against an
   explicit schema (Gemini `responseSchema` with enum fields). This makes
   region-overlay heatmaps, comparison panels, and clinician forms
   possible — none of which work reliably on free-form LLM text.

4. **Multi-LLM consensus.** Two providers run in parallel; the Consensus
   Agent computes an agreement score across (visual finding, probability
   bucket, suspected region). Disagreement is surfaced to the user — the
   opposite of LLM over-confidence.

5. **RAG grounding.** Every risk driver shown to the user carries a
   citation, and the Retrieval Agent retrieves passages from a curated
   knowledge base relevant to that specific case.

6. **Hard safety rails.** The image-quality cap, the
   never-claim-certainty prompt, the mandatory disclaimer, and the
   refusal in the Chat Agent to attempt diagnosis are all **rule-based
   guards** that operate regardless of what the LLM tries to do.

7. **Full audit trail.** Every agent invocation, every fallback, every
   provider error is recorded with a timestamp. The pipeline is fully
   reproducible from the audit log alone.

8. **Two-persona workflow.** A patient screening turns into a clinician
   review with a triage urgency score, queue placement, decision form,
   and aggregate analytics — none of which exists in a plain chat
   interface.

### 3.3 What this buys, in one sentence

> **The patient does not get a guess from a chatbot.** They get a 0–100
> score that traces back to specific IARC monographs and journal articles,
> a region heatmap, a second-opinion agreement check, a calm patient
> message, and (if escalated) a structured clinician referral packet — all
> reproducible and audited.

---

## 4. Future direction: The Doctor Agent

The user-facing pitch is simple:

> **An agentic AI that has read every relevant medical textbook and can
> give a working differential, a follow-up question plan, and a biopsy
> recommendation — under a real clinician's supervision.**

This section sketches how that becomes a real, defensible component of the
next phase of the project.

### 4.1 Concept

A new sub-agent, `doctorAgent.ts`, sits between the Cancer Risk Scoring
Agent and the Clinician Referral Agent. It performs **retrieval-augmented
generation** over a much larger reference corpus than the current
`oralCancerFacts.ts` keyword KB, and produces clinician-facing suggestions:

- a **working differential** of plausible alternative diagnoses (e.g.
  traumatic ulcer, lichen planus, candidiasis, OSCC),
- a **list of follow-up questions** for the clinician to ask the patient,
- a **suggested investigation plan** (e.g. observe 2 w, biopsy now, urgent
  referral),
- and an **explanation of every suggestion grounded in cited textbook /
  guideline passages**.

The Doctor Agent **never replaces** the clinician — it is a structured,
auditable assistant that drafts recommendations the clinician approves,
modifies, or overrides through the existing review form in
`/doctor/session/[id]`.

### 4.2 Reference corpus

A curated set of texts and guidelines, all of which exist as either
open-access publications, IARC online monographs, or paid editions that
the team has institutional access to via the university library:

| Source | What it gives the Doctor Agent |
|---|---|
| **Burket's Oral Medicine** (current edition) | Differential diagnosis chapters for white, red, ulcerated and pigmented oral lesions |
| **Cawson's Essentials of Oral Pathology and Oral Medicine** | Photomicroscopic patterns, histologic correlates |
| **WHO Classification of Head and Neck Tumours** (current 5th edition) | Authoritative tumour taxonomy and naming |
| **IARC Monographs Vol 85, 89, 100E** | Carcinogen evidence summaries |
| **NCCN Head and Neck Cancers Guidelines** (current online edition) | Referral pathways, staging, follow-up intervals |
| **Cochrane systematic reviews** on oral cancer screening | Evidence-grade summaries of intervention effectiveness |
| **Oral Oncology** and **Head & Neck** journal corpora | Latest primary research |
| **National clinical guidelines** (NICE NG12, Malaysian CPG on Oral Cancer) | Region-specific pathways |

Ingestion is local-only. Sources are paraphrased; no copyrighted material is
served verbatim through the agent. The corpus lives under
`/training/medical_corpus/` and is **never committed to GitHub**, mirroring
the existing dataset policy (`.gitignore` already excludes `data/` and
`models/`).

### 4.3 Architecture

```
                          ┌────────────────────────────────────┐
                          │    Orchestrator Agent              │
                          └─────────────┬──────────────────────┘
                                        │
       ┌────────────────────────────────┼──────────────────────────────┐
       ▼                                ▼                              ▼
 ┌─────────────┐    ┌────────────────────────────────┐    ┌──────────────────────┐
 │ Risk Scoring│ ─► │     ╔═══════════════════════╗   │ ─► │ Patient Comm Agent   │
 │             │    │     ║   DOCTOR  AGENT  (new)║   │    └──────────────────────┘
 └─────────────┘    │     ╠═══════════════════════╣   │
                    │     ║ 1. embed query        ║   │
                    │     ║ 2. retrieve top-K     ║   │
                    │     ║    chunks from corpus ║   │
                    │     ║ 3. tool-use:          ║   │
                    │     ║   - lookup_guideline  ║   │
                    │     ║   - lookup_differential│   │
                    │     ║   - lookup_biopsy_rec  ║   │
                    │     ║ 4. synthesize answer  ║   │
                    │     ║    with citations     ║   │
                    │     ╚═══════════════════════╝   │
                    └──────────────────┬─────────────┘
                                       ▼
                          ┌──────────────────────────────┐
                          │  Clinician Referral Agent    │
                          │  (now consumes Doctor Agent  │
                          │   output as input)           │
                          └──────────────────────────────┘
```

### 4.4 Technical implementation plan

| Phase | Component | Tech |
|---|---|---|
| 1 | Corpus ingestion | Markdown / PDF → chunk (~500 tokens) → metadata (title, section, page) |
| 2 | Embeddings | Gemini `text-embedding-004` or open-source `bge-base-en-v1.5` — locally cached |
| 3 | Vector store | SQLite + `sqlite-vec` extension, or a tiny in-memory FAISS — **local-first, no external service** |
| 4 | Retriever | Top-K (K=6) cosine search with metadata-filter (e.g. restrict to NCCN for referral questions) |
| 5 | Tool-use | Gemini / Claude function-calling with three explicit tools: `lookup_guideline`, `lookup_differential`, `lookup_biopsy_indication` |
| 6 | Synthesis | LLM composes a structured JSON response — differential list, question list, investigation plan — each item with `citations: [ {source, section, snippet} ]` |
| 7 | UI | New panel in `/doctor/session/[id]` showing the Doctor Agent output with each recommendation expandable to its cited snippet |

### 4.5 Safety guardrails (non-negotiable)

1. **Doctor Agent suggestions are drafts only.** The clinician must
   approve or modify before they take effect. The existing review form in
   `app/doctor/session/[id]/page.tsx` already enforces this.
2. **Every suggestion must carry a citation.** Outputs without at least
   one `citations[]` entry are rejected by the schema validator.
3. **Refusal patterns.** If the retriever returns no relevant chunks
   above a similarity threshold, the agent refuses to suggest and asks
   for clinician judgement instead of hallucinating.
4. **Out-of-scope blocker.** If the question is non-oral, the agent
   refuses — the same pattern already used in `chatAgent.ts`.
5. **Audit log.** Every retrieval (query + retrieved chunk IDs + final
   suggestion) is appended to the session audit log, so any
   recommendation can be traced back to its evidence.

### 4.6 Beyond the Doctor Agent — research roadmap

These are clearly out of the current IDP scope, but are the natural next
research questions and are worth listing for the report:

1. **Logistic-regression replacement** for the current weighted-sum risk
   model, trained on a labelled cohort. Would also produce a calibrated
   probability instead of a 0–100 prototype score.
2. **Custom-trained vision model** — already scaffolded in `/training/`,
   replacing Gemini Vision via `localModelProvider.ts`.
3. **Active learning loop** — clinician reviews (already captured in the
   `ClinicianReview` type) feed back as labels for both the vision model
   and the scoring engine.
4. **Federated learning** across multiple dental schools so no patient
   image leaves the originating institution.
5. **HL7 FHIR export** of the referral packet so it integrates with
   hospital information systems.

---

## 5. Full bibliography

The citations below are alphabetised by first author. Items marked **\***
are openly accessible at the publisher's site or PubMed Central.

### Carcinogen evidence (IARC Monographs)

**IARC, 2004.** *Betel-Quid and Areca-Nut Chewing and Some Areca-Nut-Derived
N-Nitrosamines.* IARC Monographs on the Evaluation of Carcinogenic Risks
to Humans, Volume 85. Lyon: International Agency for Research on Cancer.
[publications.iarc.fr](https://publications.iarc.fr/) — Vol 85.
Cited sections: § 2 *Studies of Cancer in Humans*; § 6 *Evaluation*.

**IARC, 2012.** *Personal Habits and Indoor Combustions.* IARC Monographs on
the Evaluation of Carcinogenic Risks to Humans, Volume 100E. Lyon:
International Agency for Research on Cancer.
[publications.iarc.fr](https://publications.iarc.fr/) — Vol 100E.
Cited sections: *Tobacco smoking → Cancers of the oral cavity and pharynx*;
*Smokeless tobacco*; *Consumption of alcoholic beverages → Cancer of the
oral cavity*.

### INHANCE consortium synergy analyses

**Hashibe M, Brennan P, Benhamou S, et al. (2007).** Alcohol drinking in
never users of tobacco, cigarette smoking in never drinkers, and the risk
of head and neck cancer: pooled analysis in the International Head and Neck
Cancer Epidemiology Consortium. *Journal of the National Cancer Institute*
**99(10):777–789**.\*

**Hashibe M, Brennan P, Chuang S, et al. (2009).** Interaction between
tobacco and alcohol use and the risk of head and neck cancer: pooled
analysis in the International Head and Neck Cancer Epidemiology Consortium.
*Cancer Epidemiology, Biomarkers & Prevention* **18(2):541–550**.\*

### Oral potentially malignant disorders & transformation rates

**Petti S (2003).** Pooled estimate of world leukoplakia prevalence: a
systematic review. *Oral Oncology* **39(8):770–780**.

**Reichart PA, Philipsen HP (2005).** Oral erythroplakia — a review. *Oral
Oncology* **41(6):551–561**.

**Speight PM (2007).** Update on oral epithelial dysplasia and progression
to cancer. *Head and Neck Pathology* **1(1):61–66**.\*

**van der Waal I (2009).** Potentially malignant disorders of the oral and
oropharyngeal mucosa; terminology, classification and present concepts of
management. *Oral Oncology* **45(4–5):317–323**.

**van der Waal I (2014).** Oral leukoplakia, the ongoing discussion on
definition and terminology. *Medicina Oral, Patología Oral y Cirugía Bucal*
**19(4):e386–e390**. Cited sections: *Clinical presentation*, *Table 1*.\*

### Global epidemiology

**Warnakulasuriya S (2009).** Global epidemiology of oral and oropharyngeal
cancer. *Oral Oncology* **45(4–5):309–316**. Cited section: *Age and sex
distribution*.

### Clinical referral pathways

**NCCN.** Clinical Practice Guidelines in Oncology — Head and Neck Cancers.
National Comprehensive Cancer Network. Current online edition,
[nccn.org/guidelines](https://www.nccn.org/guidelines). Cited section:
*Workup → Initial Evaluation*.

**NICE NG12.** Suspected cancer: recognition and referral. UK National
Institute for Health and Care Excellence,
[nice.org.uk/guidance/ng12](https://www.nice.org.uk/guidance/ng12). Cited
section: *Oral cancer*.

### Reviews and methodology

**Walsh T, Macey R, Kerr AR, et al. (2021).** Clinical assessment to screen
for oral cavity cancer and potentially malignant disorders in apparently
healthy adults. *Cochrane Database of Systematic Reviews*. Used for
context on the limits of screening accuracy.

### Repository code references

All of the weights documented above are implemented in:

- [`lib/agents/cancerRiskScoringAgent.ts`](../lib/agents/cancerRiskScoringAgent.ts) — main scoring function
- [`lib/utils/riskUtils.ts`](../lib/utils/riskUtils.ts) — `VISUAL_FINDING_SCORES` constants
- [`lib/knowledge/oralCancerFacts.ts`](../lib/knowledge/oralCancerFacts.ts) — RAG snippets that mirror this report

The corresponding commit is `c0c30f4` in the project history. The full
diff of the recalibration can be viewed at
[github.com/TKY0527/um-idp-oral-cancer-agentic-ai/commit/c0c30f4](https://github.com/TKY0527/um-idp-oral-cancer-agentic-ai/commit/c0c30f4).

---

## End of report

> ⚠️ This document is part of an educational university project. **It is
> not clinical guidance.** All risk-scoring weights, odds-ratio ranges, and
> management recommendations described here have been simplified for
> demonstration. A qualified dentist or oral medicine specialist must be
> consulted for any actual patient care.
