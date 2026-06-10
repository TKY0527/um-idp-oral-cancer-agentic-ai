import { NextResponse } from "next/server";
import type { ChatRole, ProviderKeys } from "@/lib/types/screening";
import { runDoctorAssistantAgent } from "@/lib/agents/doctorAssistantAgent";
import { getDemoPatientByPatientId } from "@/lib/data/demoPatients";
import { getPatientMeta, listSessionsForPatient } from "@/lib/server/repository";
import { getCurrentUser } from "@/lib/server/identity";
import { getAdminKeys, mergeProviderKeys } from "@/lib/server/adminKeys";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AssistantRequestBody {
  /** A patient id, or "*" for cohort mode (compare every patient). */
  patientId: string;
  messages: { role: ChatRole; content: string }[];
  apiKeys?: ProviderKeys;
}

/**
 * POST /api/doctor/assistant — the doctor's AI agent.
 *
 * Runs an agentic tool loop server-side: the model calls registry tools
 * (get_patient_profile / list_patient_sessions / compare_all_patients)
 * to fetch live data, then answers. patientId "*" asks it to compare the
 * whole cohort ("which patient should I see first?"). Doctor role required.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.role !== "doctor") {
    return NextResponse.json(
      { error: "Doctor role required" },
      { status: 403 }
    );
  }

  let body: AssistantRequestBody;
  try {
    body = (await req.json()) as AssistantRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.patientId || typeof body.patientId !== "string") {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  try {
    const cohortMode = body.patientId === "*";
    const [sessions, meta] = cohortMode
      ? [[], null]
      : await Promise.all([
          listSessionsForPatient(body.patientId),
          getPatientMeta(body.patientId),
        ]);
    const profile = cohortMode
      ? undefined
      : getDemoPatientByPatientId(body.patientId);

    const result = await runDoctorAssistantAgent({
      messages: body.messages,
      patientId: body.patientId,
      patientLabel: cohortMode
        ? "All patients (cohort comparison)"
        : profile?.name ?? meta?.label ?? body.patientId,
      sessions,
      profile,
      // User-pasted key > admin server-wide key > env key.
      apiKeys: mergeProviderKeys(body.apiKeys, await getAdminKeys()),
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
