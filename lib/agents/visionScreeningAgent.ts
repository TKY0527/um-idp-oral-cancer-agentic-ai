import type {
  ProviderStatus,
  VisionProviderId,
  VisionResult,
} from "@/lib/types/screening";
import { mockVisionProvider } from "@/lib/visionProviders/mockVisionProvider";
import { geminiVisionProvider } from "@/lib/visionProviders/geminiVisionProvider";
import { claudeVisionProvider } from "@/lib/visionProviders/claudeVisionProvider";
import { localModelProvider } from "@/lib/visionProviders/localModelProvider";
import type { VisionProvider } from "@/lib/visionProviders/mockVisionProvider";

export interface VisionScreeningInput {
  preferredProvider: VisionProviderId;
  imageBase64?: string;
  imageMimeType?: string;
  preset?: VisionResult; // when source is a sample case, skip the API call
}

export interface VisionScreeningResult {
  vision: VisionResult;
  providerStatus: ProviderStatus;
}

const PROVIDERS: Record<VisionProviderId, VisionProvider> = {
  mock: mockVisionProvider,
  gemini: geminiVisionProvider,
  claude: claudeVisionProvider,
  local: localModelProvider,
};

function isProviderConfigured(id: VisionProviderId): boolean {
  switch (id) {
    case "mock":
      return true;
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);
    case "claude":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "local":
      return Boolean(process.env.LOCAL_MODEL_ENDPOINT);
  }
}

/**
 * Vision Screening Agent
 *
 * Pluggable vision provider. Falls back to the mock provider if the requested
 * provider is missing credentials or fails at runtime, never crashes the app.
 */
export async function runVisionScreeningAgent(
  input: VisionScreeningInput
): Promise<VisionScreeningResult> {
  const requested = input.preferredProvider;

  // Sample cases short-circuit: use the preset directly via mock provider, but
  // still attribute it to the requested provider for UI clarity.
  if (input.preset) {
    return {
      vision: await mockVisionProvider.analyze({ preset: input.preset }),
      providerStatus: {
        requested,
        used: requested,
        fellBack: false,
        reason: "Sample case preset used; no live API call needed.",
      },
    };
  }

  if (!isProviderConfigured(requested)) {
    const vision = await mockVisionProvider.analyze({
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
    });
    return {
      vision,
      providerStatus: {
        requested,
        used: "mock",
        fellBack: requested !== "mock",
        reason:
          requested === "mock"
            ? undefined
            : `Provider "${requested}" is not configured. Falling back to mock.`,
      },
    };
  }

  try {
    const vision = await PROVIDERS[requested].analyze({
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
    });
    return {
      vision,
      providerStatus: { requested, used: requested, fellBack: false },
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown provider error";
    const vision = await mockVisionProvider.analyze({
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
    });
    return {
      vision,
      providerStatus: {
        requested,
        used: "mock",
        fellBack: true,
        reason: `Provider "${requested}" failed: ${reason}. Falling back to mock.`,
      },
    };
  }
}
