import { NextResponse } from "next/server";
import { getCurrentUser, webPatientId } from "@/lib/server/identity";
import { addDocument, listDocuments } from "@/lib/server/repository";
import type { PatientDocument } from "@/lib/types/screening";
import { newSessionId } from "@/lib/utils/riskUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cap stored documents so we stay well under the KV value-size limit.
const MAX_DATAURL_BYTES = 900 * 1024; // ~900 KB

/**
 * GET /api/documents?patientId=...
 *   - patient: own documents (patientId ignored)
 *   - doctor: documents for the given patientId
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const patientId =
    user.role === "doctor"
      ? (url.searchParams.get("patientId") ?? "")
      : webPatientId(user.username);
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
  const documents = await listDocuments(patientId);
  // Strip the heavy dataUrl from list responses unless a specific doc is needed.
  return NextResponse.json({ documents });
}

/** POST /api/documents  { fileName, mimeType, dataUrl, note } — patient uploads own. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { fileName?: string; mimeType?: string; dataUrl?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.dataUrl || !body.fileName) {
    return NextResponse.json({ error: "fileName and dataUrl required" }, { status: 400 });
  }
  if (body.dataUrl.length > MAX_DATAURL_BYTES) {
    return NextResponse.json(
      { error: "File too large — please upload a file under ~650 KB." },
      { status: 413 }
    );
  }

  const doc: PatientDocument = {
    id: newSessionId(),
    patientId: webPatientId(user.username),
    fileName: body.fileName.slice(0, 200),
    mimeType: body.mimeType ?? "application/octet-stream",
    dataUrl: body.dataUrl,
    uploadedAt: new Date().toISOString(),
    note: body.note?.slice(0, 500),
  };
  await addDocument(doc);
  return NextResponse.json({ ok: true, id: doc.id });
}
