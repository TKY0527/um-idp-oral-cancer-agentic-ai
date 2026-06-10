import type { Questionnaire, VisionResult } from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";

/**
 * Rich demo patients with the full data set the prototype demonstrates:
 * identity (name, age, race), habits, toothbrush usage times, tooth
 * condition, a prior dental report, a 14-day brushing log (chart), a
 * mouth-zone brushing coverage map (heatmap), and seed screenings that
 * populate the history/trend for both the patient and doctor dashboards.
 *
 * Used by:
 *   - the Telegram bot (photo → instant screening as the active demo patient,
 *     /anotherpatient to switch)
 *   - the patient dashboard (profile card + charts)
 *   - the doctor dashboard (same profile + AI assistant context)
 *
 * Pure data + pure functions — safe to import on client and server.
 */

export interface BrushingDay {
  /** 0 = today, 1 = yesterday, … */
  daysAgo: number;
  durationSec: number;
  /** Number of brushing sessions that day. */
  sessions: number;
}

export interface ZoneCoverage {
  zone:
    | "upper_left"
    | "upper_front"
    | "upper_right"
    | "lower_left"
    | "lower_front"
    | "lower_right";
  label: string;
  /** 0–100 average brushing coverage of this zone. */
  coveragePercent: number;
}

export interface SeedScreening {
  daysAgo: number;
  note: string;
  preset: VisionResult;
}

export interface DemoPatientProfile {
  /** Short key used by the Telegram /anotherpatient cycle. */
  key: string;
  /** Repository patientId the sessions are stored under. */
  patientId: string;
  /** When set, this demo patient IS that web login (web:{username}). */
  linkedWebUser?: string;
  name: string;
  age: number;
  sex: "male" | "female";
  race: string;
  occupation: string;
  city: string;
  avatar: string;
  habits: {
    tobacco: boolean;
    alcohol: boolean;
    betelQuid: boolean;
    familyHistory: boolean;
    sugaryDiet: "low" | "moderate" | "high";
  };
  brushing: {
    toothbrush: string;
    timesPerDay: number;
    /** Usual brushing clock times, e.g. ["07:15", "22:30"]. */
    usualTimes: string[];
    avgDurationSec: number;
    pressure: "low" | "normal" | "high";
    flossing: "never" | "sometimes" | "daily";
  };
  /** Narrative tooth condition for the profile card. */
  toothCondition: string;
  knownDentalIssues: string[];
  /** Professional dental-care record (几号洗牙 etc.). */
  dentalCare: {
    /** Days since the last professional scaling/cleaning. */
    lastScalingDaysAgo: number;
    /** How often they see a dentist, in plain words. */
    checkupHabit: string;
  };
  baselineQuestionnaire: Questionnaire;
  priorReport: {
    title: string;
    daysAgo: number;
    clinic: string;
    summary: string;
    findings: string[];
  };
  brushingLog: BrushingDay[];
  zoneCoverage: ZoneCoverage[];
  seedScreenings: SeedScreening[];
}

/** Deterministic 14-day brushing log around an average duration. */
function makeBrushingLog(
  avgSec: number,
  sessionsPerDay: number,
  seed: number
): BrushingDay[] {
  const log: BrushingDay[] = [];
  for (let d = 13; d >= 0; d--) {
    // Simple deterministic wobble so the chart looks organic but stable.
    const wobble = ((seed * (d + 3) * 2654435761) % 41) - 20; // -20..+20
    const skipDay = sessionsPerDay === 1 && (seed + d) % 5 === 0;
    log.push({
      daysAgo: d,
      durationSec: Math.max(20, Math.round(avgSec + wobble)),
      sessions: skipDay ? 0 : sessionsPerDay,
    });
  }
  return log;
}

export const DEMO_PATIENTS: DemoPatientProfile[] = [
  {
    key: "aisyah",
    patientId: "web:patient1",
    linkedWebUser: "patient1",
    name: "Aisyah binti Rahman",
    age: 29,
    sex: "female",
    race: "Malay",
    occupation: "Primary school teacher",
    city: "Shah Alam, Selangor",
    avatar: "🧕",
    habits: {
      tobacco: false,
      alcohol: false,
      betelQuid: false,
      familyHistory: false,
      sugaryDiet: "moderate",
    },
    brushing: {
      toothbrush: "OralScan Smart Brush S1",
      timesPerDay: 2,
      usualTimes: ["07:15", "22:30"],
      avgDurationSec: 110,
      pressure: "normal",
      flossing: "sometimes",
    },
    toothCondition:
      "Generally healthy dentition. One composite filling (lower right molar, 2023). Mild gum redness around the lower front teeth when flossing is skipped.",
    knownDentalIssues: ["Mild gingivitis (lower incisors)", "Filled tooth #46"],
    dentalCare: {
      lastScalingDaysAgo: 95, // done at the routine check-up below
      checkupHabit: "Every 6 months, never misses",
    },
    baselineQuestionnaire: {
      age: 29,
      tobacco: false,
      alcohol: false,
      betelQuid: false,
      familyHistory: false,
      lesionDurationWeeks: 0,
      pain: false,
      bleeding: false,
      ulcer: false,
    },
    priorReport: {
      title: "Routine dental check-up report",
      daysAgo: 95,
      clinic: "Klinik Pergigian Seri Alam",
      summary:
        "Routine scaling performed. Oral hygiene good. Mild plaque accumulation lingual to the lower incisors; advised daily flossing. No suspicious mucosal lesions.",
      findings: [
        "Plaque score 18% (good)",
        "Mild marginal gingivitis lower anterior",
        "Existing restoration #46 intact",
        "No mucosal abnormality detected",
      ],
    },
    brushingLog: makeBrushingLog(110, 2, 7),
    zoneCoverage: [
      { zone: "upper_left", label: "Upper left", coveragePercent: 88 },
      { zone: "upper_front", label: "Upper front", coveragePercent: 95 },
      { zone: "upper_right", label: "Upper right", coveragePercent: 86 },
      { zone: "lower_left", label: "Lower left", coveragePercent: 78 },
      { zone: "lower_front", label: "Lower front", coveragePercent: 70 },
      { zone: "lower_right", label: "Lower right", coveragePercent: 81 },
    ],
    seedScreenings: [
      {
        daysAgo: 60,
        note: "Routine monthly self-screening",
        preset: {
          visualFinding: "normal",
          suspectedRegion: "none",
          oralCancerLikeProbability: 0.06,
          confidence: 0.9,
          imageQuality: "good",
          observationSummary:
            "Mucosa appears uniform pink with no suspicious lesions.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "none",
            gumRedness: "mild",
            plaqueOrTartar: "low",
            toothStaining: "none",
            notes: "Slight redness at the lower front gum line; teeth otherwise clean.",
          },
        },
      },
      {
        daysAgo: 30,
        note: "Routine monthly self-screening",
        preset: {
          visualFinding: "normal",
          suspectedRegion: "none",
          oralCancerLikeProbability: 0.07,
          confidence: 0.88,
          imageQuality: "good",
          observationSummary:
            "No suspicious mucosal changes. Mild gum-line redness persists at the lower incisors.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "none",
            gumRedness: "mild",
            plaqueOrTartar: "low",
            toothStaining: "none",
            notes: "Mild lower-front gum redness, consistent with previous screening.",
          },
        },
      },
      {
        daysAgo: 3,
        note: "Latest self-screening",
        preset: {
          visualFinding: "normal",
          suspectedRegion: "none",
          oralCancerLikeProbability: 0.05,
          confidence: 0.91,
          imageQuality: "good",
          observationSummary:
            "Healthy-appearing mucosa. Gum redness improved after two weeks of daily flossing.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "none",
            gumRedness: "none",
            plaqueOrTartar: "low",
            toothStaining: "none",
            notes: "Gum margins look pink and firm; good cleaning visible.",
          },
        },
      },
    ],
  },
  {
    key: "tan",
    patientId: "web:patient2",
    linkedWebUser: "patient2",
    name: "Tan Wei Ming",
    age: 58,
    sex: "male",
    race: "Chinese",
    occupation: "Hawker stall owner",
    city: "Georgetown, Penang",
    avatar: "👨‍🦳",
    habits: {
      tobacco: true,
      alcohol: true,
      betelQuid: false,
      familyHistory: true,
      sugaryDiet: "high",
    },
    brushing: {
      toothbrush: "OralScan Smart Brush S1",
      timesPerDay: 1,
      usualTimes: ["06:50"],
      avgDurationSec: 65,
      pressure: "high",
      flossing: "never",
    },
    toothCondition:
      "Heavy tobacco staining and tartar. Gum recession on the lower molars. A white patch on the left lateral tongue noticed ~5 weeks ago, occasionally sore. Two missing molars.",
    knownDentalIssues: [
      "White patch (left lateral tongue) — under review",
      "Generalised gum recession",
      "Heavy extrinsic staining",
      "Missing teeth #36, #47",
    ],
    dentalCare: {
      lastScalingDaysAgo: 540, // ~18 months — long overdue
      checkupHabit: "Rarely — only when something hurts",
    },
    baselineQuestionnaire: {
      age: 58,
      tobacco: true,
      alcohol: true,
      betelQuid: false,
      familyHistory: true,
      lesionDurationWeeks: 5,
      pain: true,
      bleeding: false,
      ulcer: false,
    },
    priorReport: {
      title: "Oral medicine referral letter",
      daysAgo: 21,
      clinic: "Hospital Pulau Pinang — Dental Dept",
      summary:
        "30 pack-year smoker with regular alcohol intake. 1.2 cm white keratotic patch on the left lateral tongue border, present >4 weeks. Referred for specialist assessment and possible biopsy.",
      findings: [
        "Leukoplakia-like patch, left lateral tongue, ~1.2 cm",
        "Smoker (30 pack-years) + regular alcohol",
        "Family history: father had laryngeal cancer",
        "Advised tobacco cessation and urgent follow-up",
      ],
    },
    brushingLog: makeBrushingLog(65, 1, 13),
    zoneCoverage: [
      { zone: "upper_left", label: "Upper left", coveragePercent: 55 },
      { zone: "upper_front", label: "Upper front", coveragePercent: 72 },
      { zone: "upper_right", label: "Upper right", coveragePercent: 50 },
      { zone: "lower_left", label: "Lower left", coveragePercent: 38 },
      { zone: "lower_front", label: "Lower front", coveragePercent: 60 },
      { zone: "lower_right", label: "Lower right", coveragePercent: 42 },
    ],
    seedScreenings: [
      {
        daysAgo: 70,
        note: "First screening after noticing rough patch",
        preset: {
          visualFinding: "white_patch_like",
          suspectedRegion: "lateral tongue",
          oralCancerLikeProbability: 0.45,
          confidence: 0.7,
          imageQuality: "moderate",
          observationSummary:
            "A faint white patch-like area on the left lateral tongue border.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "possible",
            gumRedness: "mild",
            plaqueOrTartar: "heavy",
            toothStaining: "notable",
            notes:
              "Heavy tartar and tobacco staining visible; gum margins receding.",
          },
        },
      },
      {
        daysAgo: 35,
        note: "Patch persists — follow-up screening",
        preset: {
          visualFinding: "white_patch_like",
          suspectedRegion: "lateral tongue",
          oralCancerLikeProbability: 0.62,
          confidence: 0.78,
          imageQuality: "good",
          observationSummary:
            "Persistent white patch with slightly irregular borders on the left lateral tongue.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "possible",
            gumRedness: "notable",
            plaqueOrTartar: "heavy",
            toothStaining: "notable",
            notes: "Staining and tartar unchanged; gum redness around lower molars.",
          },
        },
      },
      {
        daysAgo: 5,
        note: "Pre-referral screening",
        preset: {
          visualFinding: "white_patch_like",
          suspectedRegion: "lateral tongue",
          oralCancerLikeProbability: 0.71,
          confidence: 0.82,
          imageQuality: "good",
          observationSummary:
            "Well-demarcated white patch on the left lateral tongue; borders appear irregular and slightly raised.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "visible",
            gumRedness: "notable",
            plaqueOrTartar: "heavy",
            toothStaining: "notable",
            notes:
              "Possible cavitation on a lower molar; heavy plaque and staining persist.",
          },
        },
      },
    ],
  },
  {
    key: "muthu",
    patientId: "demo:muthu",
    name: "Muthu a/l Krishnan",
    age: 45,
    sex: "male",
    race: "Indian",
    occupation: "Lorry driver",
    city: "Klang, Selangor",
    avatar: "👨🏾",
    habits: {
      tobacco: false,
      alcohol: false,
      betelQuid: true,
      familyHistory: false,
      sugaryDiet: "high",
    },
    brushing: {
      toothbrush: "OralScan Smart Brush S1",
      timesPerDay: 2,
      usualTimes: ["05:30", "23:15"],
      avgDurationSec: 50,
      pressure: "normal",
      flossing: "never",
    },
    toothCondition:
      "Daily betel quid (sirih/pinang) chewer for ~20 years — notable red-brown staining. An ulcer on the right inner cheek for ~3 weeks that stings with spicy food. Moderate plaque.",
    knownDentalIssues: [
      "Ulcer (right inner cheek) — 3 weeks, under observation",
      "Betel quid staining",
      "Moderate plaque, early gum inflammation",
    ],
    dentalCare: {
      lastScalingDaysAgo: 400, // scaling advised at outreach but not done yet
      checkupHabit: "Outreach screenings only",
    },
    baselineQuestionnaire: {
      age: 45,
      tobacco: false,
      alcohol: false,
      betelQuid: true,
      familyHistory: false,
      lesionDurationWeeks: 3,
      pain: true,
      bleeding: false,
      ulcer: true,
    },
    priorReport: {
      title: "Community dental outreach screening",
      daysAgo: 45,
      clinic: "Klinik Kesihatan Klang — outreach van",
      summary:
        "Long-term betel quid user. Traumatic-looking ulcer right buccal mucosa; advised to stop betel quid and review in 2 weeks. Oral hygiene fair; scaling recommended.",
      findings: [
        "Ulcer right buccal mucosa ~6 mm",
        "Betel quid user (20 years, daily)",
        "Generalised extrinsic staining",
        "Scaling and 2-week ulcer review advised",
      ],
    },
    brushingLog: makeBrushingLog(50, 2, 23),
    zoneCoverage: [
      { zone: "upper_left", label: "Upper left", coveragePercent: 64 },
      { zone: "upper_front", label: "Upper front", coveragePercent: 80 },
      { zone: "upper_right", label: "Upper right", coveragePercent: 58 },
      { zone: "lower_left", label: "Lower left", coveragePercent: 52 },
      { zone: "lower_front", label: "Lower front", coveragePercent: 75 },
      { zone: "lower_right", label: "Lower right", coveragePercent: 49 },
    ],
    seedScreenings: [
      {
        daysAgo: 40,
        note: "Screening after outreach visit",
        preset: {
          visualFinding: "ulcer_like",
          suspectedRegion: "inner cheek",
          oralCancerLikeProbability: 0.32,
          confidence: 0.72,
          imageQuality: "moderate",
          observationSummary:
            "An ulcer-like lesion with surrounding redness on the right inner cheek.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "possible",
            gumRedness: "mild",
            plaqueOrTartar: "moderate",
            toothStaining: "notable",
            notes: "Red-brown betel staining across molars; moderate plaque.",
          },
        },
      },
      {
        daysAgo: 14,
        note: "Ulcer persists beyond 2-week review",
        preset: {
          visualFinding: "ulcer_like",
          suspectedRegion: "inner cheek",
          oralCancerLikeProbability: 0.41,
          confidence: 0.75,
          imageQuality: "good",
          observationSummary:
            "Ulcer-like depression on the right buccal mucosa persists; margins mildly indurated in appearance.",
          disclaimer: SCREENING_DISCLAIMER,
          dentalSigns: {
            cavitySigns: "possible",
            gumRedness: "mild",
            plaqueOrTartar: "moderate",
            toothStaining: "notable",
            notes: "Staining unchanged; plaque slightly reduced after scaling.",
          },
        },
      },
    ],
  },
];

export function getDemoPatient(key: string): DemoPatientProfile | undefined {
  return DEMO_PATIENTS.find((p) => p.key === key);
}

export function getDemoPatientByPatientId(
  patientId: string
): DemoPatientProfile | undefined {
  return DEMO_PATIENTS.find((p) => p.patientId === patientId);
}

export function getProfileForWebUser(
  username: string
): DemoPatientProfile | undefined {
  return DEMO_PATIENTS.find((p) => p.linkedWebUser === username);
}

/** Cycle to the next demo patient (for the Telegram /anotherpatient command). */
export function nextDemoPatientKey(currentKey?: string): string {
  const idx = DEMO_PATIENTS.findIndex((p) => p.key === currentKey);
  return DEMO_PATIENTS[(idx + 1) % DEMO_PATIENTS.length].key;
}

export const DEFAULT_DEMO_PATIENT_KEY = DEMO_PATIENTS[0].key;

/** Short one-line description used in Telegram messages and UI chips. */
export function demoPatientOneLiner(p: DemoPatientProfile): string {
  const habitBits = [
    p.habits.tobacco ? "smoker" : null,
    p.habits.alcohol ? "drinks alcohol" : null,
    p.habits.betelQuid ? "betel quid user" : null,
  ].filter(Boolean);
  return `${p.name} — ${p.age}, ${p.race} ${p.sex}${
    habitBits.length ? ", " + habitBits.join(", ") : ", no major risk habits"
  }`;
}
