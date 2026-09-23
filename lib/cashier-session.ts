import { cookies } from "next/headers";

function getSecretBytes(): ArrayBuffer {
  const s = process.env.CASHIER_SESSION_SECRET;
  if (!s) throw new Error("CASHIER_SESSION_SECRET is not configured");
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

async function hmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    getSecretBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Returns a signed cookie value: "{cashierId}.{hmac-sha256-base64url}" */
export async function signCashierSession(cashierId: string): Promise<string> {
  const key = await hmacKey("sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(cashierId).buffer as ArrayBuffer);
  return `${cashierId}.${toBase64url(sig)}`;
}

/** Verifies the signed cookie value; returns the cashier UUID or null if tampered/missing */
export async function verifyCashierSession(value: string): Promise<string | null> {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const cashierId = value.slice(0, dot);
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64url(value.slice(dot + 1));
  } catch {
    return null;
  }
  const key = await hmacKey("verify");
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes.buffer as ArrayBuffer,
    new TextEncoder().encode(cashierId).buffer as ArrayBuffer
  );
  return valid ? cashierId : null;
}

/** Reads and verifies the cashier_session cookie; returns cashier UUID or null */
export async function readCashierSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("cashier_session")?.value;
  if (!raw) return null;
  return verifyCashierSession(raw);
}
