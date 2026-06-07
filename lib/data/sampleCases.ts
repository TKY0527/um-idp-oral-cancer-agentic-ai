import type {
  Questionnaire,
  VisionResult,
} from "@/lib/types/screening";
import { SCREENING_DISCLAIMER } from "@/lib/utils/riskUtils";

export interface SampleCase {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  preset: VisionResult;
  questionnaire: Questionnaire;
}

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: "case-1-normal",
    name: "Normal Routine Screening",
    description: "Low-risk routine screening case.",
    thumbnail: "/samples/case1.svg",
    preset: {
      visualFinding: "normal",
      suspectedRegion: "none",
      oralCancerLikeProbability: 0.08,
      confidence: 0.88,
      imageQuality: "good",
      observationSummary:
        "No suspicious mucosal lesions noted in the screening image. Tissue appears uniform in color and texture.",
      disclaimer: SCREENING_DISCLAIMER,
    },
    questionnaire: {
      // Adult age + mild alcohol so the scoring engine produces a small,
      // non-zero score that still lands in the Low band — proves the
      // scoring logic actually ran, not just an all-zero shortcut.
      age: 35,
      tobacco: false,
      alcohol: true,
      betelQuid: false,
      familyHistory: false,
      lesionDurationWeeks: 0,
      pain: false,
      bleeding: false,
      ulcer: false,
    },
  },
  {
    id: "case-2-ulcer",
    name: "Persistent Mouth Ulcer",
    description: "Medium-risk case with ulcer-like appearance.",
    thumbnail: "/samples/case2.svg",
    preset: {
      visualFinding: "ulcer_like",
      suspectedRegion: "inner cheek",
      oralCancerLikeProbability: 0.38,
      confidence: 0.76,
      imageQuality: "good",
      observationSummary:
        "An ulcer-like depression with surrounding mild redness is observed on the inner cheek mucosa.",
      disclaimer: SCREENING_DISCLAIMER,
    },
    questionnaire: {
      age: 35,
      tobacco: false,
      alcohol: true,
      betelQuid: false,
      familyHistory: false,
      lesionDurationWeeks: 3,
      pain: true,
      bleeding: false,
      ulcer: true,
    },
  },
  {
    id: "case-3-white-patch",
    name: "White Patch on Lateral Tongue",
    description: "High-risk screening case with white patch-like visual finding.",
    thumbnail: "/samples/case3.svg",
    preset: {
      visualFinding: "white_patch_like",
      suspectedRegion: "lateral tongue",
      oralCancerLikeProbability: 0.72,
      confidence: 0.82,
      imageQuality: "good",
      observationSummary:
        "A persistent white patch-like area is visible on the lateral border of the tongue. Borders appear irregular.",
      disclaimer: SCREENING_DISCLAIMER,
    },
    questionnaire: {
      age: 52,
      tobacco: true,
      alcohol: true,
      betelQuid: true,
      familyHistory: false,
      lesionDurationWeeks: 5,
      pain: true,
      bleeding: false,
      ulcer: false,
    },
  },
  {
    id: "case-4-mixed",
    name: "Mixed Red and White Patch",
    description: "High-risk screening case with mixed white/red patch-like finding.",
    thumbnail: "/samples/case4.svg",
    preset: {
      visualFinding: "mixed_white_red_patch_like",
      suspectedRegion: "floor of mouth",
      oralCancerLikeProbability: 0.81,
      confidence: 0.79,
      imageQuality: "moderate",
      observationSummary:
        "Mixed white and red patch-like area observed at the floor of the mouth with surface irregularity.",
      disclaimer: SCREENING_DISCLAIMER,
    },
    questionnaire: {
      age: 48,
      tobacco: true,
      alcohol: false,
      betelQuid: true,
      familyHistory: true,
      lesionDurationWeeks: 4,
      pain: false,
      bleeding: true,
      ulcer: true,
    },
  },
];

export function getSampleCase(id: string): SampleCase | undefined {
  return SAMPLE_CASES.find((c) => c.id === id);
}
