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
    source: "WHO oral health overview (educational paraphrase)",
    tags: ["white_patch_like", "leukoplakia", "lateral tongue", "tobacco"],
    text:
      "A persistent white patch that cannot be wiped off and has no obvious cause is called leukoplakia. " +
      "It is a potentially malignant disorder. Persistent leukoplakia lasting more than 2 weeks should " +
      "be reviewed by a dentist, especially in tobacco or betel quid users.",
  },
  {
    id: "kb-erythroplakia",
    title: "Erythroplakia (red patch)",
    source: "Cancer Council oral cancer guide (educational paraphrase)",
    tags: ["red_patch_like", "mixed_white_red_patch_like", "erythroplakia"],
    text:
      "A persistent red patch — erythroplakia — has a higher malignant transformation rate than white " +
      "patches. Mixed red-and-white lesions are particularly concerning and warrant prompt clinical " +
      "evaluation, often including biopsy.",
  },
  {
    id: "kb-ulcer",
    title: "Persistent oral ulcer",
    source: "NHS oral cancer overview (educational paraphrase)",
    tags: ["ulcer_like", "ulcer", "inner cheek", "pain"],
    text:
      "A mouth ulcer that does not heal within 3 weeks should be examined. While most ulcers are benign " +
      "(e.g. aphthous), persistent painful ulcers — especially with bleeding or in tobacco / alcohol / " +
      "betel quid users — can be early oral cancer.",
  },
  {
    id: "kb-betel-quid",
    title: "Betel quid / areca nut",
    source: "IARC monograph 85 (educational paraphrase)",
    tags: ["betelQuid", "areca", "risk factor"],
    text:
      "Betel quid chewing (with or without tobacco) is classified as carcinogenic. It is a major risk " +
      "factor for oral cancer in South and Southeast Asia. Combined use of betel quid, tobacco and " +
      "alcohol multiplies risk substantially.",
  },
  {
    id: "kb-tobacco-alcohol",
    title: "Tobacco and alcohol synergy",
    source: "WHO cancer fact sheet (educational paraphrase)",
    tags: ["tobacco", "alcohol", "risk factor"],
    text:
      "Tobacco use and heavy alcohol consumption are the two best-established risk factors for oral " +
      "cancer. Their combined effect is more than additive: people who use both have markedly higher " +
      "risk than those who use either alone.",
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
