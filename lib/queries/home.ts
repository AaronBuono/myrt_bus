import { sql } from "@/lib/db";

export interface PricingZone {
  id: string;
  zoneName: string;
  examples: string | null;
  ratePerDay: number;
  displayOrder: number;
}

export interface OpeningHour {
  dayOfWeek: number;
  isOpen: boolean;
  openingTime: string | null;
  closingTime: string | null;
}

export interface ActiveBank {
  bankName: string;
  streetAddress: string;
  phone: string;
}

type Row = Record<string, unknown>;

export async function getHomePageData() {
  const [zones, bank, hours] = await Promise.all([
    sql`SELECT id, zone_name, examples, rate_per_day, display_order
        FROM pricing_zones ORDER BY display_order ASC` as Promise<Row[]>,
    sql`SELECT bank_name, street_address, phone
        FROM bank_records WHERE is_active = TRUE LIMIT 1` as Promise<Row[]>,
    sql`SELECT oh.day_of_week, oh.is_open, oh.opening_time, oh.closing_time
        FROM opening_hours oh
        JOIN bank_records br ON br.id = oh.bank_record_id
        WHERE br.is_active = TRUE
        ORDER BY oh.day_of_week ASC` as Promise<Row[]>,
  ]);

  return {
    zones: zones.map((r) => ({
      id: r.id as string,
      zoneName: r.zone_name as string,
      examples: r.examples as string | null,
      ratePerDay: Number(r.rate_per_day),
      displayOrder: Number(r.display_order),
    })) as PricingZone[],
    bank: bank[0]
      ? ({
          bankName: bank[0].bank_name as string,
          streetAddress: bank[0].street_address as string,
          phone: bank[0].phone as string,
        } as ActiveBank)
      : null,
    hours: hours.map((r) => ({
      dayOfWeek: Number(r.day_of_week),
      isOpen: r.is_open as boolean,
      openingTime: r.opening_time as string | null,
      closingTime: r.closing_time as string | null,
    })) as OpeningHour[],
  };
}
