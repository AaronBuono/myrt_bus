// Test stand-in for lib/db.ts: the same `sql` tagged template, backed by in-memory Postgres.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

export const pg = new PGlite({ extensions: { btree_gist, pgcrypto } });

export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
  const params = values.map((v) => (v instanceof Date ? v.toISOString() : v));
  const res = await pg.query(text, params);
  return res.rows as Record<string, unknown>[];
}

export function getDb() {
  return sql;
}
