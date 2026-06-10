import type { KnowledgeEntry } from "@/lib/knowledge/oralCancerFacts";

/**
 * Dental / tooth-health knowledge base — grounds FUNCTION 2 of the system
 * (cavities 蛀牙, gums, plaque, staining, scaling 洗牙) the same way the
 * oral-cancer KB grounds function 1. Educational paraphrases, NOT clinical
 * guidelines. Tags include Chinese terms so bilingual queries match.
 */
export const DENTAL_HEALTH_KB: KnowledgeEntry[] = [
  {
    id: "kb-caries-process",
    title: "How cavities (dental caries) form",
    source: "WHO oral health fact sheet; cariology textbooks — educational paraphrase",
    tags: ["cavity", "caries", "decay", "蛀牙", "sugar", "plaque"],
    text:
      "Dental caries (蛀牙) develops when plaque bacteria ferment dietary sugars into acid, which " +
      "demineralises enamel over time. Early decay shows as chalky white spots and is REVERSIBLE with " +
      "fluoride and better hygiene; once a cavity forms in dentine it needs a filling. Frequency of " +
      "sugar intake matters more than total amount — constant snacking keeps the mouth acidic.",
  },
  {
    id: "kb-caries-prevention",
    title: "Preventing tooth decay",
    source: "WHO / national dental association guidance — educational paraphrase",
    tags: ["cavity", "caries", "prevention", "蛀牙", "fluoride", "brushing"],
    text:
      "Twice-daily brushing with fluoride toothpaste, limiting sugary snacks and drinks between meals, " +
      "daily flossing, and regular dental check-ups are the proven pillars of caries prevention. " +
      "Fluoride strengthens enamel and can arrest early lesions. Sealants protect deep grooves in " +
      "children's and young adults' molars.",
  },
  {
    id: "kb-gingivitis",
    title: "Gingivitis — bleeding, red gums",
    source: "Periodontology consensus reviews — educational paraphrase",
    tags: ["gum", "gingivitis", "bleeding", "牙龈", "牙龈出血", "plaque"],
    text:
      "Gingivitis is plaque-induced gum inflammation: red, swollen gums that bleed on brushing or " +
      "flossing. It is REVERSIBLE — with thorough daily plaque removal, bleeding usually improves " +
      "within 1–2 weeks. Bleeding gums are a signal to clean MORE thoroughly (gently), not to avoid " +
      "the area. Untreated gingivitis can progress to periodontitis.",
  },
  {
    id: "kb-periodontitis",
    title: "Periodontitis and gum recession",
    source: "Periodontology consensus reviews — educational paraphrase",
    tags: ["gum", "periodontitis", "recession", "牙周", "牙周病", "bone"],
    text:
      "Periodontitis is irreversible loss of the bone and ligament supporting teeth, usually after " +
      "years of untreated gingivitis. Signs include gum recession, loose teeth, persistent bad breath " +
      "and deep pockets. Smoking is a major risk factor and also MASKS bleeding, hiding the disease. " +
      "Management needs professional deep cleaning and sustained home care.",
  },
  {
    id: "kb-plaque-tartar",
    title: "Plaque vs tartar (calculus)",
    source: "Dental hygiene references — educational paraphrase",
    tags: ["plaque", "tartar", "calculus", "牙菌斑", "牙结石"],
    text:
      "Plaque (牙菌斑) is the soft bacterial film you can remove with a brush and floss. Within days, " +
      "minerals in saliva harden plaque into tartar (牙结石), which is cemented to the tooth and can " +
      "ONLY be removed by professional scaling. Tartar makes further plaque build-up faster and keeps " +
      "gums chronically inflamed.",
  },
  {
    id: "kb-scaling",
    title: "Professional scaling (洗牙): what and how often",
    source: "Dental association patient guidance — educational paraphrase",
    tags: ["scaling", "cleaning", "洗牙", "tartar", "frequency", "牙结石"],
    text:
      "Scaling (洗牙) removes tartar and stains with ultrasonic instruments — it does not damage enamel. " +
      "A common recommendation is every 6 months, or 3–4 months for people with gum disease, heavy " +
      "tartar, smoking/betel staining, or diabetes. Mild sensitivity for a few days afterwards is " +
      "normal. Visible heavy tartar, notable staining, or more than 6–12 months since the last " +
      "cleaning are practical signs that scaling is due.",
  },
  {
    id: "kb-staining",
    title: "Tooth staining — tea, coffee, tobacco, betel",
    source: "Dental hygiene references — educational paraphrase",
    tags: ["staining", "stain", "染色", "tobacco", "betel", "槟榔", "coffee"],
    text:
      "Extrinsic stains from tea, coffee, tobacco smoke and betel quid (槟榔) sit on the tooth surface " +
      "and in plaque/tartar; professional cleaning removes most of them. Betel quid produces a " +
      "characteristic red-brown stain. Staining itself is cosmetic, but heavy stain usually marks heavy " +
      "plaque/tartar — and tobacco/betel carry separate, far more serious cancer and gum risks.",
  },
  {
    id: "kb-brushing-technique",
    title: "Brushing technique that actually works",
    source: "Dental association guidance (modified Bass technique) — educational paraphrase",
    tags: ["brushing", "technique", "刷牙", "2 minutes", "pressure", "coverage"],
    text:
      "Brush 2 minutes, twice a day, with GENTLE pressure — hard scrubbing wears enamel and gums " +
      "without cleaning better. Angle bristles 45° toward the gum line and use small circular strokes. " +
      "The most-missed zones are the inner (tongue-side) surfaces and the back molars; smart-toothbrush " +
      "coverage maps typically show exactly these gaps. Replace the brush head every ~3 months.",
  },
  {
    id: "kb-flossing",
    title: "Why flossing matters",
    source: "Dental association guidance — educational paraphrase",
    tags: ["floss", "flossing", "牙线", "interdental", "gum"],
    text:
      "A brush cannot reach between teeth, where most gum inflammation and many cavities start. Daily " +
      "flossing or interdental brushes remove this plaque. Bleeding during the first week of flossing " +
      "is common and usually means the gums are inflamed — keep going gently and it typically settles.",
  },
  {
    id: "kb-sugary-diet",
    title: "Diet, sugar frequency and oral health",
    source: "WHO sugar guidance — educational paraphrase",
    tags: ["sugar", "diet", "饮食", "cavity", "蛀牙", "snack"],
    text:
      "WHO recommends keeping free sugars under 10 % (ideally 5 %) of energy intake. For teeth, " +
      "FREQUENCY is the key: each sugary snack or sweet drink triggers an acid attack lasting up to " +
      "30–60 minutes. Limiting sugar to mealtimes, choosing water over sweet drinks, and not sipping " +
      "sweet drinks slowly across the day dramatically reduces decay risk.",
  },
  {
    id: "kb-smoking-gums",
    title: "Smoking and oral health beyond cancer",
    source: "Periodontology and public-health reviews — educational paraphrase",
    tags: ["tobacco", "smoking", "吸烟", "gum", "periodontitis", "healing"],
    text:
      "Beyond cancer risk, smoking roughly doubles to quadruples the risk of periodontitis, slows " +
      "healing after dental treatment, masks gum bleeding (hiding disease), causes heavy staining and " +
      "bad breath, and is a leading cause of tooth loss. Gum health measurably improves within months " +
      "of quitting.",
  },
  {
    id: "kb-betel-mouth",
    title: "Betel quid effects on the mouth",
    source: "IARC Vol 85; oral medicine reviews — educational paraphrase",
    tags: ["betel", "betelQuid", "槟榔", "staining", "fibrosis", "cancer"],
    text:
      "Besides being a Group 1 carcinogen, betel quid (槟榔) abrades enamel, stains teeth deep red-brown, " +
      "and can cause oral submucous fibrosis — progressive stiffening of the cheeks that limits mouth " +
      "opening and is itself potentially malignant. Any betel user with a mouth ulcer, white/red patch, " +
      "or reduced mouth opening should be examined promptly.",
  },
  {
    id: "kb-checkup-frequency",
    title: "How often to see a dentist",
    source: "Dental association recall guidance — educational paraphrase",
    tags: ["check-up", "frequency", "复诊", "dentist", "recall"],
    text:
      "A routine check-up every 6 months suits most adults; high-risk patients (active decay, gum " +
      "disease, smokers/betel users, diabetics) benefit from 3–4-month recalls, while very low-risk " +
      "adults may stretch to 12 months on a dentist's advice. Regular visits catch decay, gum disease " +
      "and suspicious lesions while they are still simple to treat.",
  },
  {
    id: "kb-sensitivity",
    title: "Tooth sensitivity",
    source: "Dental references — educational paraphrase",
    tags: ["sensitivity", "敏感", "pain", "enamel", "recession"],
    text:
      "Short sharp pain to cold/sweet usually means exposed dentine — from gum recession, enamel wear " +
      "(often hard brushing), or early decay. Desensitising toothpaste and softer brushing help; " +
      "persistent or worsening sensitivity, or pain on biting, needs a dental examination to rule out " +
      "a cavity or cracked tooth.",
  },
];
