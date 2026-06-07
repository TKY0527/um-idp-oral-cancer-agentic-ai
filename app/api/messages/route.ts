import { NextResponse } from "next/server";
import { getCurrentUser, webPatientId } from "@/lib/server/identity";
import { appendMessage, listMessages } from "@/lib/server/repository";
import type { CareMessage } from "@/lib/types/screening";
import { newSessionId } from "@/lib/utils/riskUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/messages?patientId=...
 *   - patient: may only read their own thread (patientId is ignored, forced to self)
 *   - doctor:  must pass patientId to read a specific patient's thread
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const requested = url.searchParams.get("patientId") ?? "";
  const patientId =
    user.role === "doctor" ? requested : webPatientId(user.username);
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  const messages = await listMessages(patientId);
  return NextResponse.json({ messages });
}

/**
 * POST /api/messages  { patientId, text }
 *   - patient: posts to their own thread as "patient"
 *   - doctor:  posts to the given patient's thread as "doctor"
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: { patientId?: string; text?: string };
  try {
    body = (await req.json()) as { patientId?: string; text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  const patientId =
    user.role === "doctor"
      ? (body.patientId ?? "").trim()
      : webPatientId(user.username);
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  const msg: CareMessage = {
    id: newSessionId(),
    patientId,
    from: user.role === "doctor" ? "doctor" : "patient",
    fromLabel: user.displayName,
    text: text.slice(0, 2000),
    timestamp: new Date().toISOString(),
  };
  await appendMessage(msg);
  return NextResponse.json({ ok: true, message: msg });
}
