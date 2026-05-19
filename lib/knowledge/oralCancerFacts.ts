/**
 * Small knowledge base used by the Retrieval Agent for RAG-style grounding.
 *
 * These excerpts are paraphrased general educational facts about oral cancer
 * risk factors, lesion types, and screening practice. They are NOT clinical
 * guidelines and must NOT be used for diagnosis. They give the agent
 * something to cite in its explanation so the patient can see why the
 * system flagged their result.
 */

export interface KnowledgeEntry {
  id: string;
  title: string;
  source: string;
  /** Keyword tags used for naive relevance scoring. */
  tags: string[];
  text: string;
}

export const ORAL_CANCER_KB: KnowledgeEntry[] = [
  {
    id: "kb-leukoplakia",
    title: "Leukoplakia (white patch)",
    source:
      "Reichart PA, Philipsen HP (2005); Speight PM (2007); van der Waal I (2014) — educational paraphrase",
    tags: ["white_patch_like", "leukoplakia", "lateral tongue", "tobacco"],
    text:
      "A persistent white patch that cannot be wiped off and has no obvious cause is called leukoplakia. " +
      "It is a potentially malignant disorder; pooled malignant transformation rate across studies is " +
      "roughly 3–17 %, with higher rates in lesions with dysplasia and in non-smokers. Persistent " +
      "leukoplakia lasting more than 2 weeks should be reviewed by a dentist, especially in tobacco " +
      "or betel quid users.",
  },
  {
    id: "kb-erythroplakia",
    title: "Erythroplakia and mixed red-white lesions",
    source: "van der Waal I (2014) Oral Oncology — educational paraphrase",
    tags: ["red_patch_like", "mixed_white_red_patch_like", "erythroplakia"],
    text:
      "Erythroplakia — a persistent red patch — has a markedly higher malignant transformation rate " +
      "than leukoplakia (approximately 14–50 % in reported series). Mixed red-and-white lesions " +
      "(erythroleukoplakia) are even more concerning: most biopsies show high-grade dysplasia or early " +
      "invasive carcinoma. These lesions warrant prompt clinical evaluation, often including biopsy.",
  },
  {
    id: "kb-ulcer",
    title: "Non-healing oral ulcer (>2 weeks)",
    source:
      "NCCN Head and Neck Cancers Guidelines; NHS oral cancer overview — educational paraphrase",
    tags: ["ulcer_like", "ulcer", "inner cheek", "pain"],
    text:
      "A mouth ulcer that has not healed within 2 weeks is the conventional referral threshold; an " +
      "ulcer persisting beyond 4 weeks is a stronger clinical red flag. While most ulcers are benign " +
      "(e.g. aphthous), persistent painful ulcers — especially with bleeding or in tobacco / alcohol / " +
      "betel quid users — can represent early oral squamous cell carcinoma.",
  },
  {
    id: "kb-betel-quid",
    title: "Betel quid / areca nut chewing",
    source:
      "IARC Monograph Vol 85 (2004) — educational paraphrase",
    tags: ["betelQuid", "areca", "risk factor"],
    text:
      "Betel quid chewing — with or without tobacco — is classified by IARC as a Group 1 (definite) " +
      "human carcinogen. It is the largest modifiable risk factor for oral cancer in South and " +
      "South-East Asia, with pooled odds ratios in the range of 7–20× over non-chewers. Combined use " +
      "with tobacco and alcohol amplifies risk substantially through supra-additive interaction.",
  },
  {
    id: "kb-tobacco-alcohol",
    title: "Tobacco × alcohol synergy",
    source:
      "IARC Monograph Vol 100E (2012); INHANCE pooled analysis (Hashibe 2007, 2009) — educational paraphrase",
    tags: ["tobacco", "alcohol", "risk factor"],
    text:
      "Tobacco use and heavy alcohol consumption are independent IARC Group 1 carcinogens for the oral " +
      "cavity. Individually, the odds ratio is roughly 3–5× for tobacco and 2–3× for alcohol. " +
      "Critically, their combined effect is supra-additive: pooled analyses by the INHANCE consortium " +
      "report combined odds ratios up to ≈ 35× in heavy concurrent users — far more than the sum of " +
      "the individual risks.",
  },
  {
    id: "kb-age",
    title: "Age and oral cancer incidence",
    source:
      "Warnakulasuriya S (2009) Oral Oncology — educational paraphrase",
    tags: ["age", "risk factor"],
    text:
      "Incidence rises steeply after age 40 and roughly doubles each decade through the 60s. Most " +
      "diagnoses occur between age 50 and 70, although betel quid use in Asia and HPV-associated " +
      "oropharyngeal cancer in younger adults are shifting the demographic.",
  },
  {
    id: "kb-lateral-tongue",
    title: "Lateral tongue lesions",
    source: "Oral medicine review (educational paraphrase)",
    tags: ["lateral tongue", "tongue", "white_patch_like"],
    text:
      "The lateral border of the tongue is one of the highest-risk sites for oral squamous cell " +
      "carcinoma. Any persistent lesion on the lateral tongue, especially a non-healing white patch, " +
      "warrants clinical evaluation.",
  },
  {
    id: "kb-floor-mouth",
    title: "Floor of mouth lesions",
    source: "Oral medicine review (educational paraphrase)",
    tags: ["floor of mouth", "mixed_white_red_patch_like"],
    text:
      "The floor of the mouth is another high-risk site. Mixed white/red lesions here (erythroleukoplakia) " +
      "should be considered for biopsy because of an elevated risk of dysplasia or carcinoma.",
  },
  {
    id: "kb-screening",
    title: "Self-screening and early detection",
    source: "Generic public-health messaging (educational paraphrase)",
    tags: ["screening", "self-check", "follow-up"],
    text:
      "Monthly self-examination of the mouth — using a mirror and good light — helps detect changes " +
      "early. Anything that does not heal within 2-3 weeks should be reviewed by a dentist. Early-stage " +
      "oral cancer has a much better outcome than late-stage disease.",
  },
  {
    id: "kb-disclaimer",
    title: "Limitations of image-based screening",
    source: "Generic AI safety note (educational paraphrase)",
    tags: ["disclaimer", "screening", "limitation"],
    text:
      "Image-based AI screening cannot replace a clinical examination. Lighting, framing and image " +
      "quality strongly affect what the model sees. A poor-quality image should not be interpreted " +
      "as low risk; if quality is limited, a re-capture is needed.",
  },
];
