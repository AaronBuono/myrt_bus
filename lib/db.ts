import { neon, neonConfig } from "@neondatabase/serverless";

// Local development only: point the driver at a local Neon HTTP proxy instead of Neon
// (e.g. http://localhost:4444/sql). Never set this in Vercel.
if (process.env.NEON_FETCH_ENDPOINT && process.env.NODE_ENV !== "production") {
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
}

// Lazily initialised so build-time static analysis doesn't fail without env vars.
let _sql: ReturnType<typeof neon> | null = null;

export function getDb(): ReturnType<typeof neon> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Tagged-template convenience: await sql`SELECT 1`
export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  return getDb()(strings, ...values);
}
