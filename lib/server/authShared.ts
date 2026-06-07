/**
 * Authentication primitives — Web Crypto only, so this module is safe to import
 * from BOTH the Edge middleware and Node route handlers.
 *
 * Demo-grade: three seeded accounts with plaintext-compared passwords. This is
 * appropriate for a university IDP prototype, NOT for real patient data. Swap
 * for hashed passwords + a real user store before any production use.
 */

export type Role = "patient" | "doctor";

export interface AppUser {
  username: string;
  role: Role;
  displayName: string;
}

export interface SessionPayload {
  u: string; // username
  r: Role; // role
  n: string; // displayName
  exp: number; // epoch seconds
}

export const COOKIE_NAME = "oralscan_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ── Seeded demo accounts ─────────────────────────────────────────────────────
interface SeededUser extends AppUser {
  password: string;
}

export const SEED_USERS: SeededUser[] = [
  {
    username: "patient1",
    password: process.env.SEED_PATIENT1_PASSWORD ?? "patient1",
    role: "patient",
    displayName: "Patient One",
  },
  {
    username: "patient2",
    password: process.env.SEED_PATIENT2_PASSWORD ?? "patient2",
    role: "patient",
    displayName: "Patient Two",
  },
  {
    username: "doctor",
    password: process.env.SEED_DOCTOR_PASSWORD ?? "doctor",
    role: "doctor",
    displayName: "Dr. Lim (Oral Medicine)",
  },
  // Shared teammate test account (patient role).
  {
    username: "test1",
    password: process.env.SEED_TEST1_PASSWORD ?? "test1",
    role: "patient",
    displayName: "Test User",
  },
];

export function findSeededUser(username: string): SeededUser | undefined {
  return SEED_USERS.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
}

export function verifyCredentials(
  username: string,
  password: string
): AppUser | null {
  const u = findSeededUser(username);
  if (!u) return null;
  // Plaintext compare — demo only.
  if (u.password !== password) return null;
  return { username: u.username, role: u.role, displayName: u.displayName };
}

// ── Signed-cookie tokens (HMAC-SHA256 via Web Crypto) ────────────────────────

function authSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    // Dev fallback — overridden in production via env var.
    "dev-insecure-secret-change-me-in-production-oralscan"
  );
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64Url(s: string): string {
  return bytesToB64Url(new TextEncoder().encode(s));
}

function b64UrlToStr(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return bytesToB64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(user: AppUser): Promise<string> {
  const payload: SessionPayload = {
    u: user.username,
    r: user.role,
    n: user.displayName,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = strToB64Url(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(body);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(b64UrlToStr(body)) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function payloadToUser(p: SessionPayload): AppUser {
  return { username: p.u, role: p.r, displayName: p.n };
}
