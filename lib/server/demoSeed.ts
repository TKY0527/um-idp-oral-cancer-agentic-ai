import { runOrchestratorAgent } from "@/lib/agents/orchestratorAgent";
import {
  DEMO_PATIENTS,
  type DemoPatientProfile,
} from "@/lib/data/demoPatients";
import { saveSession } from "@/lib/server/repository";
import { kvDel, kvSetNx } from "@/lib/server/kv";

/**
 * Seed the demo patients' historical screenings into the KV store so the
 * doctor dashboard, patient history page, and risk-trend chart have real
 * data the first time anyone looks.
 *
 * Idempotent: a SET-NX flag per patient guards against double seeding
 * (including concurrent webhook calls). Sessions run through the real
 * orchestrator with preset vision results (provider "mock" + preset →
 * deterministic, no LLM cost), then their timestamps are back-dated.
 */

const SEED_FLAG_VERSION = "v1";

export async function seedDemoPatient(
  profile: DemoPatientProfile
): Promise<boolean> {
  const flagKey = `demo:seeded:${SEED_FLAG_VERSION}:${profile.key}`;
  // Claim the flag first so concurrent webhook calls cannot double-seed…
  const fresh = await kvSetNx(flagKey, new Date().toISOString());
  if (!fresh) return false;

  try {
    await writeSeedSessions(profile);
    return true;
  } catch (err) {
    // …but roll the flag back on failure so a transient KV/agent error
    // doesn't permanently skip this patient's history.
    await kvDel(flagKey).catch(() => undefined);
    throw err;
  }
}

async function writeSeedSessions(profile: DemoPatientProfile): Promise<void> {
  // Oldest first so the newest-first KV lists end up in the right order.
  const screenings = [...profile.seedScreenings].sort(
    (a, b) => b.daysAgo - a.daysAgo
  );

  for (const seed of screenings) {
    const session = await runOrchestratorAgent({
      source: "sample",
      sampleId: `demo-${profile.key}`,
      preset: seed.preset,
      questionnaire: profile.baselineQuestionnaire,
      preferredProvider: "mock",
      expertPanelMode: "never",
      lastScalingDaysAgo: profile.dentalCare.lastScalingDaysAgo + seed.daysAgo,
    });

    // Back-date the session so the history shows a believable timeline.
    const when = new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000);
    const started = new Date(when.getTime() - 90 * 1000);
    session.startedAt = started.toISOString();
    session.finishedAt = when.toISOString();
    session.auditLog = session.auditLog.map((e) => ({
      ...e,
      timestamp: when.toISOString(),
    }));
    session.imageMeta = {
      ...session.imageMeta,
      fileName: seed.note,
    };

    await saveSession(session, {
      patientId: profile.patientId,
      label: profile.name,
      channel: "web",
    });
  }
}

/** Seed every demo patient. Returns the keys that were newly seeded. */
export async function ensureDemoDataSeeded(): Promise<string[]> {
  const seeded: string[] = [];
  for (const profile of DEMO_PATIENTS) {
    try {
      if (await seedDemoPatient(profile)) seeded.push(profile.key);
    } catch (err) {
      console.error(`[demoSeed] failed for ${profile.key}:`, err);
    }
  }
  return seeded;
}
