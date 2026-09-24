// Time handling. All instants are stored in UTC (timestamptz) and displayed in Melbourne time.
// Safe to import from client and server code; no dependencies.

export const TIME_ZONE = "Australia/Melbourne";

/** Minutes the zone is ahead of UTC at a given instant (e.g. 600 for AEST, 660 for AEDT). */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * Converts a Melbourne wall-clock date + time ("YYYY-MM-DD", "HH:MM") to a UTC instant.
 * Handles daylight saving: a time that doesn't exist (the skipped hour in early October)
 * resolves to the equivalent time after the clocks go forward.
 */
export function melbourneToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wallAsUtc - zoneOffsetMinutes(new Date(wallAsUtc), TIME_ZONE) * 60_000;
  guess = wallAsUtc - zoneOffsetMinutes(new Date(guess), TIME_ZONE) * 60_000;
  return new Date(guess);
}

/** Today's date in Melbourne as "YYYY-MM-DD". */
export function todayInMelbourne(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Calendar days in an inclusive "YYYY-MM-DD" range. */
export function daysInclusive(startDate: string, endDate: string): number {
  const a = Date.UTC(...(startDate.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(endDate.split("-").map(Number) as [number, number, number]));
  return Math.round((b - a) / 86_400_000) + 1;
}

// ── Display helpers (always Melbourne time) ─────────────────

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

/** "Sat 3 Oct 2026, 10:00 am" */
export function fmtDateTime(v: unknown): string {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleString("en-AU", {
    timeZone: TIME_ZONE,
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/** "Sat 3 Oct 2026" for an instant, in Melbourne. */
export function fmtInstantDate(v: unknown): string {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** "10:00 am" for an instant, in Melbourne. */
export function fmtInstantTime(v: unknown): string {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleTimeString("en-AU", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
}

/** "10:00 AM" for a wall-clock "HH:MM[:SS]" string. */
export function fmtWallTime(t: unknown): string {
  if (!t) return "—";
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** "Saturday 3 October 2026" for a plain "YYYY-MM-DD" date (no time-zone shift). */
export function fmtIsoDateLong(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/** Normalises a DB DATE value to "YYYY-MM-DD". Drivers parse DATE as local midnight, so read local parts. */
export function isoDate(v: unknown): string {
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  return String(v).slice(0, 10);
}
