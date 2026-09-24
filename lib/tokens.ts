import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Manage-link token: 32 random bytes, base64url. Only the SHA-256 hash is stored,
 * so a database leak doesn't expose working links.
 */
export function createManageToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before touching the DB (32 bytes → 43 base64url chars). */
export function looksLikeToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
