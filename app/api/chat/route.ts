import { NextResponse } from "next/server";
import type { ChatRequestBody } from "@/lib/types/screening";
import { runChatAgent } from "@/lib/agents/chatAgent";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";
import { getCurrentUser } from "@/lib/server/identity";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth: chat handles patient health context — require a logged-in user.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  try {
    const reply = await runChatAgent({
      messages: body.messages,
      patientContext: body.patientContext,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
