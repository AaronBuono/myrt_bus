import "server-only";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db";

type Row = Record<string, unknown>;

/**
 * Fixed-window rate limiter backed by Postgres, so it holds across serverless instances
 * without another service. Returns true if the request is allowed.
 *
 * Fails open: if the DB call errors, the request goes through (the booking itself would fail anyway).
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const rows = (await sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (
        ${key},
        to_timestamp(floor(extract(epoch FROM NOW()) / ${windowSeconds}) * ${windowSeconds}),
        1
      )
      ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
      RETURNING count
    `) as Row[];

    // Occasionally clear out old windows.
    if (Math.random() < 0.02) {
      sql`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`.catch(() => {});
    }

    return Number(rows[0]?.count ?? 0) <= limit;
  } catch (err) {
    console.error("rateLimit failed open:", err);
    return true;
  }
}

/** Client IP from Vercel's forwarding headers, hashed so raw IPs aren't stored. */
export function clientKey(headers: Headers): string {
  const ip =
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
