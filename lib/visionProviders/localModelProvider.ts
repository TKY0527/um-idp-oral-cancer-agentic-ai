import type { VisionResult } from "@/lib/types/screening";
import type {
  VisionProvider,
  VisionProviderInput,
} from "@/lib/visionProviders/mockVisionProvider";

// Future: when the team trains a custom oral cancer model, expose it via a
// FastAPI server (see /training/future_fastapi_model_server.py) and call it
// from here. For now this provider intentionally raises so the orchestrator
// falls back to mock mode.
const LOCAL_ENDPOINT =
  process.env.LOCAL_MODEL_ENDPOINT ?? "http://localhost:8000/predict";

export const localModelProvider: VisionProvider = {
  id: "local",
  label: "Future Local Model",
  async analyze(input: VisionProviderInput): Promise<VisionResult> {
    if (input.preset) return input.preset;

    if (!process.env.LOCAL_MODEL_ENDPOINT) {
      throw new Error(
        "Local model endpoint not configured. Set LOCAL_MODEL_ENDPOINT once the FastAPI server is running."
      );
    }
    if (!input.imageBase64) {
      throw new Error("No image data provided to local model provider");
    }

    const timeoutMs = parseInt(
      process.env.VISION_API_TIMEOUT_MS ?? "30000",
      10
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(LOCAL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: input.imageBase64,
          mime_type: input.imageMimeType ?? "image/jpeg",
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Local model server error ${res.status}`);
      }
      return (await res.json()) as VisionResult;
    } finally {
      clearTimeout(timer);
    }
  },
};
