import type {
  ScreeningRequestBody,
  VisionProviderId,
} from "@/lib/types/screening";
import { runOrchestratorAgent } from "@/lib/agents/orchestratorAgent";
import { getSampleCase } from "@/lib/data/sampleCases";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";
import { getCurrentUser } from "@/lib/server/identity";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: VisionProviderId[] = [
  "mock",
  "gemini",
  "claude",
  "openai",
  "local",
];

function resolveProvider(p?: VisionProviderId): VisionProviderId {
  if (p && ALLOWED.includes(p)) return p;
  const env = (process.env.VISION_PROVIDER ?? "mock") as VisionProviderId;
  return ALLOWED.includes(env) ? env : "mock";
}

/**
 * POST /api/screening/stream — Server-Sent Events stream.
 *
 * Emits one event per agent transition (`agent_started`, `agent_completed`,
 * `agent_skipped`) and a final `session_done` event with the full
 * ScreeningSession JSON. The client uses these to drive a real-time
 * pipeline visualization that reflects actual server progress.
 *
 * Event format (text/event-stream):
 *   event: agent_started
 *   data: {"agent":"ToothbrushIoTAgent","detail":"..."}
 */
export async function POST(req: Request) {
  // Auth: streaming pipeline triggers paid LLM calls — require a logged-in user.
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ScreeningRequestBody;
  try {
    body = (await req.json()) as ScreeningRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const provider = resolveProvider(body.preferredProvider);

  let preset = undefined;
  let imageBase64 = body.imageBase64;
  let imageMimeType = body.imageMimeType;
  if (body.source === "sample") {
    const sample = getSampleCase(body.sampleId ?? "");
    if (!sample) {
      return new Response(
        JSON.stringify({ error: `Unknown sampleId: ${body.sampleId}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    preset = sample.preset;
    imageBase64 = undefined;
    imageMimeType = undefined;
  } else if (body.source === "upload" && !imageBase64) {
    return new Response(
      JSON.stringify({ error: "imageBase64 required for uploads" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } else if (body.source !== "upload" && body.source !== "sample") {
    return new Response(
      JSON.stringify({ error: "source must be 'sample' or 'upload'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }
      // Initial ping so the client knows the stream is open.
      send("stream_open", { ts: Date.now() });

      try {
        const session = await runOrchestratorAgent({
          source: body.source,
          sampleId: body.sampleId,
          preset,
          imageBase64,
          imageMimeType: imageMimeType ?? "image/jpeg",
          fileName: body.fileName,
          questionnaire: body.questionnaire,
          preferredProvider: provider,
          consensusProvider: body.consensusProvider,
          apiKeys: body.apiKeys,
          onStep: (e) => {
            const eventName =
              e.status === "started"
                ? "agent_started"
                : e.status === "completed"
                  ? "agent_completed"
                  : "agent_skipped";
            send(eventName, { agent: e.agent, detail: e.detail });
          },
        });

        send("session_done", session);
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable buffering for proxies that respect this header.
      "X-Accel-Buffering": "no",
    },
  });
}
