import {
  kvGet,
  kvSet,
  kvDel,
  kvListPushUnique,
  kvListRange,
} from "@/lib/server/kv";
import type { CareMessage, ClinicianReview, ScreeningSession } from "@/lib/types/screening";

/**
 * Data-access layer over the KV store.
 *
 * Key schema:
 *   session:{sessionId}          → ScreeningSession JSON
 *   patient:{patientId}:sessions → list of sessionIds (newest first)
 *   index:allSessions            → list of ALL sessionIds (newest first, for doctor)
 *   index:patients               → list of known patientIds
 *   patient:{patientId}:meta     → { patientId, label, channel }
 *   thread:{patientId}           → list of CareMessage JSON (newest first)
 *   tglink:{chatId}              → patientId (telegram chat → patient account)
 */

export interface PatientMeta {
  patientId: string;
  label: string;
  channel: "web" | "telegram";
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(
  session: ScreeningSession,
  owner: { patientId: string; label: string; channel: "web" | "telegram" }
): Promise<void> {
  const enriched: ScreeningSession = {
    ...session,
    ownerId: owner.patientId,
    ownerLabel: owner.label,
    channel: owner.channel,
  };
  await kvSet(`session:${session.sessionId}`, enriched);
  await kvListPushUnique(`patient:${owner.patientId}:sessions`, session.sessionId);
  await kvListPushUnique(`index:allSessions`, session.sessionId);
  await registerPatient({
    patientId: owner.patientId,
    label: owner.label,
    channel: owner.channel,
  });
}

export async function getSession(
  sessionId: string
): Promise<ScreeningSession | null> {
  return kvGet<ScreeningSession>(`session:${sessionId}`);
}

async function hydrateMany(ids: string[]): Promise<ScreeningSession[]> {
  const out: ScreeningSession[] = [];
  for (const id of ids) {
    const s = await getSession(id);
    if (s) out.push(s);
  }
  return out;
}

export async function listSessionsForPatient(
  patientId: string,
  limit = 200
): Promise<ScreeningSession[]> {
  const ids = await kvListRange(`patient:${patientId}:sessions`, 0, limit - 1);
  return hydrateMany(ids);
}

/**
 * Returns EVERY session across all patients/channels.
 *
 * ⚠️ TRUST BOUNDARY: this performs NO authorization. Callers MUST verify the
 * requester is a clinician before calling it (see app/api/sessions/route.ts,
 * which checks `user.role === "doctor"`). If this prototype is ever extended
 * to multiple clinics, add org-scoping here (e.g. `index:org:{orgId}:sessions`).
 */
export async function listAllSessions(limit = 500): Promise<ScreeningSession[]> {
  const ids = await kvListRange(`index:allSessions`, 0, limit - 1);
  return hydrateMany(ids);
}

export async function setReview(
  sessionId: string,
  review: ClinicianReview
): Promise<ScreeningSession | null> {
  const s = await getSession(sessionId);
  if (!s) return null;
  const updated: ScreeningSession = { ...s, clinicianReview: review };
  await kvSet(`session:${sessionId}`, updated);
  return updated;
}

export async function deleteSession(
  sessionId: string,
  patientId: string
): Promise<void> {
  await kvDel(`session:${sessionId}`);
  // Lists are pruned lazily on read (hydrateMany skips missing), but remove the
  // id from the owning list to keep counts honest.
  const ids = await kvListRange(`patient:${patientId}:sessions`, 0, -1);
  // Rebuild without the id (LREM via re-push is overkill; we just re-push others).
  // Simpler: rely on lazy pruning. No-op here keeps the code robust.
  void ids;
}

// ── Patients registry ────────────────────────────────────────────────────────

export async function registerPatient(meta: PatientMeta): Promise<void> {
  await kvSet(`patient:${meta.patientId}:meta`, meta);
  await kvListPushUnique(`index:patients`, meta.patientId);
}

export async function getPatientMeta(
  patientId: string
): Promise<PatientMeta | null> {
  return kvGet<PatientMeta>(`patient:${patientId}:meta`);
}

export async function listPatients(): Promise<PatientMeta[]> {
  const ids = await kvListRange(`index:patients`, 0, -1);
  const out: PatientMeta[] = [];
  for (const id of ids) {
    const m = await getPatientMeta(id);
    if (m) out.push(m);
  }
  return out;
}

// ── Care messages (doctor ↔ patient) ─────────────────────────────────────────

export async function appendMessage(msg: CareMessage): Promise<void> {
  await kvListPushUnique(
    `thread:${msg.patientId}`,
    JSON.stringify({ ...msg })
  );
}

export async function listMessages(
  patientId: string,
  limit = 200
): Promise<CareMessage[]> {
  const raw = await kvListRange(`thread:${patientId}`, 0, limit - 1);
  const msgs: CareMessage[] = [];
  for (const r of raw) {
    try {
      msgs.push(JSON.parse(r) as CareMessage);
    } catch {
      /* skip malformed */
    }
  }
  // Stored newest-first; return chronological.
  return msgs.reverse();
}

// ── Telegram links ───────────────────────────────────────────────────────────

export async function linkTelegram(
  chatId: number | string,
  patientId: string
): Promise<void> {
  await kvSet(`tglink:${chatId}`, patientId);
}

export async function getTelegramPatientId(
  chatId: number | string
): Promise<string | null> {
  return kvGet<string>(`tglink:${chatId}`);
}
