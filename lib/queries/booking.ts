import { sql } from "@/lib/db";

type Row = Record<string, unknown>;

/** Dates that already have a confirmed/in_use booking — returned as "YYYY-MM-DD" strings */
export async function getUnavailableDates(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT generate_series(start_date, end_date, '1 day'::interval)::date AS d
    FROM bookings
    WHERE status IN ('confirmed', 'in_use')
  ` as Row[]);
  return rows.map((r) => String(r.d).slice(0, 10));
}

/** Look up org by name — returns category and whether they are invoiced */
export async function lookupOrganisation(name: string) {
  const rows = (await sql`
    SELECT id, category, invoicing_frequency
    FROM organisations
    WHERE LOWER(name) = LOWER(${name})
    LIMIT 1
  ` as Row[]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id as string,
    category: rows[0].category as "a" | "c",
    isInvoicedOrg: rows[0].invoicing_frequency !== null,
  };
}

/** Fetch current pricing snapshot */
export async function getPricingSnapshot() {
  const [zones, settings] = await Promise.all([
    sql`SELECT id, zone_name, examples, rate_per_day, display_order
        FROM pricing_zones ORDER BY display_order ASC` as Promise<Row[]>,

    sql`SELECT additional_day_rate FROM system_settings LIMIT 1` as Promise<Row[]>,
  ]);
  return {
    zones: zones.map((r) => ({
      id: r.id as string,
      zoneName: r.zone_name as string,
      examples: r.examples as string | null,
      ratePerDay: Number(r.rate_per_day),
      displayOrder: Number(r.display_order),
    })),
    additionalDayRate: Number(settings[0]?.additional_day_rate ?? 68),
  };
}

/** Current conditions of use */
export async function getCurrentConditions() {
  const rows = (await sql`
    SELECT id, version, content FROM conditions_of_use WHERE is_current = TRUE LIMIT 1
  ` as Row[]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id as string,
    version: Number(rows[0].version),
    content: rows[0].content as string,
  };
}

/** Generate next booking reference: BK-YYYY-NNN */
export async function generateReference(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = (await sql`
    SELECT COUNT(*) as cnt FROM bookings
    WHERE reference LIKE ${"BK-" + year + "-%"}
  ` as Row[]);
  const n = Number(rows[0]?.cnt ?? 0) + 1;
  return `BK-${year}-${String(n).padStart(3, "0")}`;
}
