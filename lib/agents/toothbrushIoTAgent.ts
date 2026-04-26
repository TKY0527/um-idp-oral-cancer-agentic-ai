import type { ImageQuality, ToothbrushTelemetry } from "@/lib/types/screening";

export interface ToothbrushIoTInput {
  // Hint about expected image quality from the source (sample/upload).
  qualityHint?: ImageQuality;
  // Optional deterministic seed (e.g. session id) so demos look stable.
  seed?: string;
}

function seedNumber(seed?: string): number {
  if (!seed) return Math.floor(Math.random() * 1_000_000);
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Toothbrush IoT Agent
 *
 * Simulates telemetry coming from a smart toothbrush sensor pod that captured
 * the oral cavity image. In a real device this would come from accelerometer,
 * pressure sensor, and on-board camera firmware.
 */
export async function runToothbrushIoTAgent(
  input: ToothbrushIoTInput
): Promise<ToothbrushTelemetry> {
  const seed = seedNumber(input.seed);

  // Deterministic-feeling but varied numbers based on the seed.
  const brushingDurationSec = 90 + (seed % 90); // 90..179s
  const pressureLevels: ToothbrushTelemetry["pressureLevel"][] = [
    "low",
    "normal",
    "normal",
    "normal",
    "high",
  ];
  const pressureLevel = pressureLevels[seed % pressureLevels.length];

  // Quality hint biases motion blur and image quality.
  let motionBlurScore: number;
  let imageQualityScore: number;
  switch (input.qualityHint) {
    case "good":
      motionBlurScore = 0.1 + ((seed >> 3) % 12) / 100; // 0.10–0.21
      imageQualityScore = 0.78 + ((seed >> 5) % 15) / 100; // 0.78–0.92
      break;
    case "poor":
      motionBlurScore = 0.55 + ((seed >> 3) % 30) / 100;
      imageQualityScore = 0.3 + ((seed >> 5) % 20) / 100;
      break;
    case "moderate":
    default:
      motionBlurScore = 0.2 + ((seed >> 3) % 25) / 100;
      imageQualityScore = 0.55 + ((seed >> 5) % 25) / 100;
  }

  const coveragePercent = 60 + ((seed >> 7) % 35); // 60..94
  const sessionValid = imageQualityScore >= 0.5 && motionBlurScore < 0.5;

  let note: string;
  if (!sessionValid) {
    note =
      "Image quality is below the prototype threshold. A rescan is recommended for more reliable screening.";
  } else if (imageQualityScore >= 0.8) {
    note = "Image quality is acceptable for prototype screening.";
  } else {
    note =
      "Image quality is moderate. Findings should be interpreted with caution.";
  }

  return {
    brushingDurationSec,
    pressureLevel,
    motionBlurScore: Number(motionBlurScore.toFixed(2)),
    imageQualityScore: Number(imageQualityScore.toFixed(2)),
    coveragePercent,
    sessionValid,
    note,
  };
}
