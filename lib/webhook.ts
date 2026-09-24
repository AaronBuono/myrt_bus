import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

/**
 * Verifies a Svix-signed webhook (Resend uses Svix). The header is a space-separated
 * list of "v1,<base64>" signatures; more than one appears during secret rotation.
 */
export function verifySvixSignature(opts: {
  secret: string;
  id: string;
  timestamp: string;
  signatureHeader: string;
  body: string;
  now?: number;
}): boolean {
  const ts = Number(opts.timestamp);
  const nowSeconds = (opts.now ?? Date.now()) / 1000;
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(opts.secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${opts.id}.${opts.timestamp}.${opts.body}`).digest();

  return opts.signatureHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
