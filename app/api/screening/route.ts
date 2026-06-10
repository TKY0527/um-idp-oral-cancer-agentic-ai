import { NextResponse } from "next/server";
import type {
  ScreeningRequestBody,
  VisionProviderId,
} from "@/lib/types/screening";
import { runOrchestratorAgent } from "@/lib/agents/orchestratorAgent";
import { getSampleCase } from "@/lib/data/sampleCases";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";
import { getCurrentUser } from "@/lib/server/identity";
import { getAdminKeys, mergeProviderKeys } from "@/lib/server/adminKeys";

// Force-load .env.local on first import so OS-level env vars (e.g. an expired
// GEMINI_API_KEY left over in the user's Windows environment) cannot override
// the values intended for this project.
loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS: VisionProviderId[] = [
  "mock",
  "gemini",
  "claude",
  "openai",
  "local",
];

function resolveProvider(requested?: VisionProviderId): VisionProviderId {
  if (requested && ALLOWED_PROVIDERS.includes(requested)) return requested;
  const fromEnv = (process.env.VISION_PROVIDER ?? "mock").toLowerCase() as VisionProviderId;
  if (ALLOWED_PROVIDERS.includes(fromEnv)) return fromEnv;
  return "mock";
}

export async function POST(req: Request) {
  // Auth: the pipeline triggers paid LLM calls — require a logged-in user.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: ScreeningRequestBody;
  try {
    body = (await req.json()) as ScreeningRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.questionnaire) {
    return NextResponse.json(
      { error: "Missing questionnaire" },
      { status: 400 }
    );
  }

  const provider = resolveProvider(body.preferredProvider);

  // Key precedence: user-pasted demo key > admin server-wide key > env key.
  const apiKeys = mergeProviderKeys(body.apiKeys, await getAdminKeys());

  // Sample case path: use the preset, no image bytes needed.
  if (body.source === "sample") {
    const sample = getSampleCase(body.sampleId ?? "");
    if (!sample) {
      return NextResponse.json(
        { error: `Unknown sampleId: ${body.sampleId}` },
        { status: 400 }
      );
    }

    try {
      const session = await runOrchestratorAgent({
        source: "sample",
        sampleId: sample.id,
        preset: sample.preset,
        questionnaire: body.questionnaire,
        preferredProvider: provider,
        apiKeys,
      });
      return NextResponse.json(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: `Orchestrator failed: ${msg}` },
        { status: 500 }
      );
    }
  }

  // Upload path: require image bytes.
  if (body.source === "upload") {
    if (!body.imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required for uploaded images" },
        { status: 400 }
      );
    }
    try {
      const session = await runOrchestratorAgent({
        source: "upload",
        imageBase64: body.imageBase64,
        imageMimeType: body.imageMimeType ?? "image/jpeg",
        fileName: body.fileName,
        questionnaire: body.questionnaire,
        preferredProvider: provider,
        consensusProvider: body.consensusProvider,
        apiKeys,
      });
      return NextResponse.json(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: `Orchestrator failed: ${msg}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "source must be 'sample' or 'upload'" },
    { status: 400 }
  );
}

export async function GET() {
  return NextResponse.json({
    name: "Oral Cancer Agentic AI Screening API",
    method: "POST",
    expectedBody: {
      source: "sample | upload",
      sampleId: "(when source=sample) e.g. case-1-normal",
      imageBase64: "(when source=upload) base64-encoded image",
      imageMimeType: "image/jpeg | image/png",
      fileName: "optional",
      preferredProvider: "mock | gemini | claude | openai | local",
      apiKeys: {
        openai: "(optional) demo BYOK key — used instead of the backend key",
        gemini: "(optional) demo BYOK key",
        anthropic: "(optional) demo BYOK key",
      },
      questionnaire: {
        age: "number",
        tobacco: "boolean",
        alcohol: "boolean",
        betelQuid: "boolean",
        familyHistory: "boolean",
        lesionDurationWeeks: "number",
        pain: "boolean",
        bleeding: "boolean",
        ulcer: "boolean",
      },
    },
  });
}
