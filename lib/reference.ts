// Booking references: "ACB-" + 6 characters from an alphabet with no 0/O/1/I/L,
// so they can be read out over the phone without confusion.
// 31^6 ≈ 887 million combinations; collisions are caught by the UNIQUE constraint and retried.

export const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 6;
// Largest multiple of the alphabet size below 256, for unbiased rejection sampling.
const LIMIT = 256 - (256 % REFERENCE_ALPHABET.length);

export function generateReference(): string {
  let out = "";
  while (out.length < LENGTH) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(LENGTH * 2));
    for (const b of bytes) {
      if (b < LIMIT) out += REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length];
      if (out.length === LENGTH) break;
    }
  }
  return `ACB-${out}`;
}

/** Postgres unique_violation on the reference column — safe to retry with a new reference. */
export function isReferenceCollision(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string };
  return e?.code === "23505" && e?.constraint === "bookings_reference_key";
}

/** Postgres exclusion_violation from bookings_no_overlap — the dates were taken. */
export function isOverlapViolation(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string };
  return e?.code === "23P01";
}
